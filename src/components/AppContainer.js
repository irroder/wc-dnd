class AppContainer extends HTMLElement {
	constructor() {
		super();
		this.polygons = [];
		this.loadFromStorage();
	}

	connectedCallback() {
		this.render();
		this.setupEventListeners();

		setTimeout(() => {
			this.restoreFromStorage();
		}, 100);
	}

	render() {
		this.innerHTML = `
			<div class="app-header">
				<button id="createBtn">Создать</button>
				<div class="controls-right">
					<button id="saveBtn">Сохранить</button>
					<button id="resetBtn">Сбросить</button>
				</div>
			</div>
			<buffer-zone id="bufferZone"></buffer-zone>
			<work-zone id="workZone"></work-zone>
		`;
	}

	setupEventListeners() {
		const createBtn = this.querySelector("#createBtn");
		const saveBtn = this.querySelector("#saveBtn");
		const resetBtn = this.querySelector("#resetBtn");

		createBtn.addEventListener("click", () => this.createPolygons());
		saveBtn.addEventListener("click", () => this.saveToStorage());
		resetBtn.addEventListener("click", () => this.resetData());
	}

	createPolygons() {
		const bufferZone = this.querySelector("#bufferZone");
		const count = Math.floor(Math.random() * 16) + 5;

		for (let i = 0; i < count; i++) {
			const polygon = this.generateRandomPolygon();
			this.polygons.push(polygon);
			bufferZone.addPolygon(polygon);
		}
	}

	generateRandomPolygon() {
		const id =
			"poly_" +
			Date.now() +
			"_" +
			Math.random().toString(36).substr(2, 9);
		const vertexCount = Math.floor(Math.random() * 8) + 3;
		const centerX = Math.random() * 300 + 50;
		const centerY = Math.random() * 200 + 50;
		const radius = Math.random() * 40 + 20;

		const points = [];
		for (let i = 0; i < vertexCount; i++) {
			const angle = (i / vertexCount) * Math.PI * 2;
			const radiusVariation = radius * (0.5 + Math.random() * 0.5);
			const x = Math.cos(angle) * radiusVariation;
			const y = Math.sin(angle) * radiusVariation;
			points.push({ x, y });
		}

		return {
			id,
			points,
			color: "#CC0000",
			zone: "buffer",
			position: { x: centerX, y: centerY },
			zIndex: this.polygons.length,
		};
	}

	saveToStorage() {
		const bufferZone = this.querySelector("#bufferZone");
		const workZone = this.querySelector("#workZone");

		const data = {
			bufferPolygons: bufferZone ? bufferZone.getAllPolygons() : [],
			workPolygons: workZone ? workZone.getAllPolygons() : [],
			workZoneState: workZone
				? {
						zoom: workZone.zoom,
						panX: workZone.panX,
						panY: workZone.panY,
				  }
				: null,
			timestamp: Date.now(),
		};

		localStorage.setItem("polygonApp", JSON.stringify(data));
	}

	loadFromStorage() {
		const data = localStorage.getItem("polygonApp");
		if (data) {
			const parsed = JSON.parse(data);
			this.savedData = parsed;
		}
	}

	restoreFromStorage() {
		if (!this.savedData) return;

		const bufferZone = this.querySelector("#bufferZone");
		const workZone = this.querySelector("#workZone");

		if (this.savedData.bufferPolygons && bufferZone) {
			this.savedData.bufferPolygons.forEach((polygonData) => {
				bufferZone.addPolygon(polygonData);
			});
		}

		if (this.savedData.workPolygons && workZone) {
			this.savedData.workPolygons.forEach((polygonData) => {
				workZone.addPolygon(polygonData);
			});
		}

		if (this.savedData.workZoneState && workZone) {
			workZone.zoom = this.savedData.workZoneState.zoom;
			workZone.panX = this.savedData.workZoneState.panX;
			workZone.panY = this.savedData.workZoneState.panY;
			workZone.requestUpdate();
		}
	}

	resetData() {
		this.polygons = [];
		localStorage.removeItem("polygonApp");

		const bufferZone = this.querySelector("#bufferZone");
		const workZone = this.querySelector("#workZone");

		if (bufferZone) bufferZone.clear();
		if (workZone) workZone.clear();
	}
}

customElements.define("app-container", AppContainer);
