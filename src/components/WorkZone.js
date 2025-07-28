class WorkZone extends HTMLElement {
	constructor() {
		super();
		this.polygons = new Map();

		this.axisOffsetX = 40;
		this.axisOffsetY = 30;

		this.zoom = 1;
		this.panX = 0;
		this.panY = 0;
		this.isDragging = false;
		this.lastMouseX = 0;
		this.lastMouseY = 0;

		this.gridSize = 50;
		this.minGridSize = 10;
		this.maxGridSize = 200;

		this.animationFrame = null;
	}

	connectedCallback() {
		this.className = "work-zone";
		this.render();
		this.setupEventListeners();
		setTimeout(() => {
			this.drawGrid();
			this.updateAxes();
		}, 0);
	}

	render() {
		this.innerHTML = `
			<div class="zoom-info">Зум: 100%</div>
			<canvas class="grid-canvas"></canvas>
			<svg class="polygon-svg" width="100%" height="100%"></svg>
			<div class="axis-corner"></div>
			<div class="axis-y">
				<div class="axis-labels-y"></div>
			</div>
			<div class="axis-x">
				<div class="axis-labels-x"></div>
			</div>
		`;
	}

	setupEventListeners() {
		this.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				this.handleZoom(e);
			},
			{ passive: false }
		);

		this.addEventListener("mousedown", (e) => {
			if (
				e.button === 0 &&
				!e.target.classList.contains("draggable-polygon") &&
				e.target.tagName.toLowerCase() !== "polygon" &&
				!e.target.hasAttribute("draggable")
			) {
				this.startPanning(e);
			}
		});

		document.addEventListener("mousemove", (e) => {
			if (this.isDragging) {
				this.handlePanning(e);
			}
		});

		document.addEventListener("mouseup", () => {
			if (this.isDragging) {
				this.stopPanning();
			}
		});

		this.addEventListener("dragover", (e) => {
			e.preventDefault();
			this.classList.add("drop-highlight");
		});

		this.addEventListener("dragleave", (e) => {
			if (!this.contains(e.relatedTarget)) {
				this.classList.remove("drop-highlight");
			}
		});

		this.addEventListener("drop", (e) => {
			e.preventDefault();
			this.classList.remove("drop-highlight");

			try {
				const jsonData = e.dataTransfer.getData("application/json");
				if (jsonData) {
					const data = JSON.parse(jsonData);

					if (data.sourceZone === "buffer") {
						const rect = this.getBoundingClientRect();
						const x = e.clientX - rect.left;
						const y = e.clientY - rect.top;
						this.receivePolygon(data.polygonId, x, y);
					}
				}
			} catch (error) {
				console.error("WorkZone: Error processing drop event", error);
			}
		});
	}

	screenToWorld(screenX, screenY) {
		const worldX = (screenX - this.axisOffsetX) / this.zoom + this.panX;
		const worldY =
			(this.offsetHeight - this.axisOffsetY - screenY) / this.zoom +
			this.panY;
		return { x: worldX, y: worldY };
	}

	worldToScreen(worldX, worldY) {
		const screenX = (worldX - this.panX) * this.zoom + this.axisOffsetX;
		const screenY =
			this.offsetHeight -
			this.axisOffsetY -
			(worldY - this.panY) * this.zoom;
		return { x: screenX, y: screenY };
	}

	handleZoom(e) {
		const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.max(0.1, Math.min(5, this.zoom * zoomFactor));

		if (newZoom !== this.zoom) {
			const rect = this.getBoundingClientRect();
			const mouseX = e.clientX - rect.left;
			const mouseY = e.clientY - rect.top;

			const worldPoint = this.screenToWorld(mouseX, mouseY);

			this.zoom = newZoom;

			const newWorldPoint = this.screenToWorld(mouseX, mouseY);
			this.panX += worldPoint.x - newWorldPoint.x;
			this.panY += worldPoint.y - newWorldPoint.y;

			this.requestUpdate();
		}
	}

	startPanning(e) {
		this.isDragging = true;
		this.lastMouseX = e.clientX;
		this.lastMouseY = e.clientY;
		this.classList.add("panning");
	}

	handlePanning(e) {
		if (this.isDragging) {
			const deltaX = e.clientX - this.lastMouseX;
			const deltaY = e.clientY - this.lastMouseY;

			this.panX -= deltaX / this.zoom;
			this.panY += deltaY / this.zoom;

			this.lastMouseX = e.clientX;
			this.lastMouseY = e.clientY;

			this.requestUpdate();
		}
	}

	stopPanning() {
		this.isDragging = false;
		this.classList.remove("panning");
	}

	requestUpdate() {
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame);
		}

		this.animationFrame = requestAnimationFrame(() => {
			this.updateTransform();
			this.drawGrid();
			this.updateAxes();
			this.updateZoomInfo();
			this.animationFrame = null;
		});
	}

	updateTransform() {
		const svg = this.querySelector(".polygon-svg");
		const viewBoxX = this.panX;
		const viewBoxY = this.panY;
		const viewBoxWidth = (this.offsetWidth - this.axisOffsetX) / this.zoom;
		const viewBoxHeight =
			(this.offsetHeight - this.axisOffsetY) / this.zoom;

		svg.setAttribute(
			"viewBox",
			`${viewBoxX} ${
				-viewBoxY - viewBoxHeight
			} ${viewBoxWidth} ${viewBoxHeight}`
		);
		svg.style.transform = `scaleY(-1)`;
	}

	drawGrid() {
		const canvas = this.querySelector(".grid-canvas");
		const ctx = canvas.getContext("2d");

		canvas.width = this.offsetWidth;
		canvas.height = this.offsetHeight;

		ctx.clearRect(0, 0, canvas.width, canvas.height);

		let currentGridSize = this.gridSize * this.zoom;

		while (currentGridSize < this.minGridSize) {
			currentGridSize *= 2;
		}
		while (currentGridSize > this.maxGridSize) {
			currentGridSize /= 2;
		}

		const gridStartX =
			this.axisOffsetX - ((this.panX * this.zoom) % currentGridSize);
		const gridStartY =
			this.offsetHeight -
			this.axisOffsetY +
			((this.panY * this.zoom) % currentGridSize);

		ctx.strokeStyle = "#555555";
		ctx.lineWidth = 1;
		ctx.beginPath();

		for (let x = gridStartX; x < canvas.width; x += currentGridSize) {
			if (x >= this.axisOffsetX) {
				ctx.moveTo(x, 0);
				ctx.lineTo(x, canvas.height - this.axisOffsetY);
			}
		}

		for (let y = gridStartY; y >= 0; y -= currentGridSize) {
			if (y <= canvas.height - this.axisOffsetY) {
				ctx.moveTo(this.axisOffsetX, y);
				ctx.lineTo(canvas.width, y);
			}
		}

		ctx.stroke();

		ctx.strokeStyle = "#888888";
		ctx.lineWidth = 3;
		ctx.beginPath();

		const axisYScreenX = this.axisOffsetX - this.panX * this.zoom;
		if (axisYScreenX >= this.axisOffsetX && axisYScreenX <= canvas.width) {
			ctx.moveTo(axisYScreenX, 0);
			ctx.lineTo(axisYScreenX, canvas.height - this.axisOffsetY);
		}

		const axisXScreenY =
			canvas.height - this.axisOffsetY + this.panY * this.zoom;
		if (
			axisXScreenY >= 0 &&
			axisXScreenY <= canvas.height - this.axisOffsetY
		) {
			ctx.moveTo(this.axisOffsetX, axisXScreenY);
			ctx.lineTo(canvas.width, axisXScreenY);
		}

		ctx.stroke();
	}

	updateAxes() {
		const labelsX = this.querySelector(".axis-labels-x");
		const labelsY = this.querySelector(".axis-labels-y");

		labelsX.innerHTML = "";
		labelsY.innerHTML = "";

		const gridSize = this.gridSize * this.zoom;
		const labelSpacing = Math.max(60, gridSize);

		const startWorldX =
			Math.floor(this.panX / this.gridSize) * this.gridSize;
		for (
			let worldX = startWorldX;
			worldX <=
			this.panX + (this.offsetWidth - this.axisOffsetX) / this.zoom;
			worldX += this.gridSize
		) {
			const screenPos = this.worldToScreen(worldX, 0);
			if (
				screenPos.x >= this.axisOffsetX &&
				screenPos.x <= this.offsetWidth
			) {
				const label = document.createElement("div");
				label.className = "axis-label";
				label.textContent = Math.round(worldX).toString();
				label.style.left = screenPos.x - 15 + "px";
				labelsX.appendChild(label);
			}
		}

		const startWorldY =
			Math.floor(this.panY / this.gridSize) * this.gridSize;
		for (
			let worldY = startWorldY;
			worldY <=
			this.panY + (this.offsetHeight - this.axisOffsetY) / this.zoom;
			worldY += this.gridSize
		) {
			const screenPos = this.worldToScreen(0, worldY);
			if (
				screenPos.y >= 0 &&
				screenPos.y <= this.offsetHeight - this.axisOffsetY
			) {
				const label = document.createElement("div");
				label.className = "axis-label";
				label.textContent = Math.round(worldY).toString();
				label.style.top = screenPos.y - 8 + "px";
				labelsY.appendChild(label);
			}
		}
	}

	updateZoomInfo() {
		const zoomInfo = this.querySelector(".zoom-info");
		zoomInfo.textContent = `Зум: ${Math.round(this.zoom * 100)}%`;
	}

	receivePolygon(polygonId, dropScreenX, dropScreenY) {
		const bufferZone = document.querySelector("buffer-zone");
		if (bufferZone) {
			const polygonData = bufferZone.getPolygon(polygonId);
			if (polygonData) {
				const worldPos = this.screenToWorld(dropScreenX, dropScreenY);

				const originalPoints = polygonData.points.map((point) => ({
					x: point.x - (polygonData.position?.x || 0),
					y: point.y - (polygonData.position?.y || 0),
				}));

				polygonData.points = originalPoints;
				polygonData.position = { x: worldPos.x, y: worldPos.y };
				polygonData.zone = "work";

				this.addPolygon(polygonData);
				bufferZone.removePolygon(polygonId);
			}
		}
	}

	addPolygon(polygonData) {
		const svg = this.querySelector(".polygon-svg");
		const polygonElement = this.createPolygonElement(polygonData);
		svg.appendChild(polygonElement);
		this.polygons.set(polygonData.id, polygonData);
	}

	createPolygonElement(polygonData) {
		const polygon = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"polygon"
		);

		const adjustedPoints = polygonData.points.map((point) => ({
			x: point.x + (polygonData.position?.x || 0),
			y: point.y + (polygonData.position?.y || 0),
		}));

		const pointsString = adjustedPoints
			.map((point) => `${point.x},${point.y}`)
			.join(" ");

		polygon.setAttribute("points", pointsString);
		polygon.setAttribute("fill", polygonData.color);
		polygon.setAttribute("stroke", "#ffffff");
		polygon.setAttribute("stroke-width", "2");
		polygon.setAttribute("data-id", polygonData.id);
		polygon.setAttribute("class", "draggable-polygon");
		polygon.setAttribute("draggable", "true");
		polygon.style.cursor = "grab";

		polygon.addEventListener("mousedown", (e) => {
			e.stopPropagation();
		});

		polygon.addEventListener("dragstart", (e) => {
			const dragImage = document.createElement("div");
			dragImage.style.width = "1px";
			dragImage.style.height = "1px";
			dragImage.style.backgroundColor = "transparent";
			dragImage.style.position = "absolute";
			dragImage.style.top = "-1000px";
			document.body.appendChild(dragImage);

			e.dataTransfer.setDragImage(dragImage, 0, 0);

			setTimeout(() => {
				document.body.removeChild(dragImage);
			}, 0);

			const transferData = JSON.stringify({
				polygonId: polygonData.id,
				sourceZone: "work",
			});
			e.dataTransfer.setData("application/json", transferData);
			e.dataTransfer.effectAllowed = "move";
			polygon.classList.add("dragging");
		});

		polygon.addEventListener("dragend", (e) => {
			polygon.classList.remove("dragging");
		});

		return polygon;
	}

	removePolygon(polygonId) {
		const polygon = this.querySelector(`[data-id="${polygonId}"]`);
		if (polygon) {
			polygon.remove();
		}
		this.polygons.delete(polygonId);
	}

	getPolygon(polygonId) {
		return this.polygons.get(polygonId);
	}

	clear() {
		const svg = this.querySelector(".polygon-svg");
		svg.innerHTML = "";
		this.polygons.clear();

		this.zoom = 1;
		this.panX = 0;
		this.panY = 0;
		this.requestUpdate();
	}

	getAllPolygons() {
		return Array.from(this.polygons.values());
	}
}

customElements.define("work-zone", WorkZone);
