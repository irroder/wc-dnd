import "./styles/main.css";

import "./components/AppContainer.js";
import "./components/BufferZone.js";
import "./components/WorkZone.js";

document.addEventListener("DOMContentLoaded", () => {
	if (!("customElements" in window)) {
		document.body.innerHTML =
			"<h1>Ваш браузер не поддерживает веб-компоненты. Пожалуйста, обновите браузер.</h1>";
		return;
	}
});
