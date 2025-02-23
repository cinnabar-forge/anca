import "./styles/font.css";
import "./styles/input.css";
import "./styles/table.css";
import "./styles/common.css";
import "./styles/color.css";
import App from "./App.svelte";

const app = new App({
  target: document.getElementById("app") as HTMLElement
});

export default app;
