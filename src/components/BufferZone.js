class BufferZone extends HTMLElement {
	constructor() {
		super();
		this.polygons = new Map();
	}

	connectedCallback() {
		this.className = "buffer-zone";
		this.render();
		this.setupDragDrop();
	}

	render() {
		this.innerHTML = `
			<svg class="polygon-svg" width="100%" height="100%"></svg>
		`;
	}

	setupDragDrop() {
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

					if (data.sourceZone === "work") {
						this.receivePolygon(
							data.polygonId,
							e.offsetX,
							e.offsetY
						);
					}
				}
			} catch (error) {
				console.error("BufferZone: Error processing drop event", error);
			}
		});
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
				sourceZone: "buffer",
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

	receivePolygon(polygonId, x, y) {
		const workZone = document.querySelector("work-zone");
		if (workZone) {
			const polygonData = workZone.getPolygon(polygonId);
			if (polygonData) {
				const originalPoints = polygonData.points.map((point) => ({
					x: point.x - (polygonData.position?.x || 0),
					y: point.y - (polygonData.position?.y || 0),
				}));

				polygonData.points = originalPoints;
				polygonData.position = { x, y };
				polygonData.zone = "buffer";

				this.addPolygon(polygonData);
				workZone.removePolygon(polygonId);
			}
		}
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
	}

	getAllPolygons() {
		return Array.from(this.polygons.values());
	}
}

customElements.define("buffer-zone", BufferZone);
