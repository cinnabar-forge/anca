/* eslint-disable security/detect-object-injection */
import blessed from "blessed";

export class TUI {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "Cinnabar Forge Anna",
    });
    // eslint-disable-next-line no-process-exit
    this.screen.key(["C-c"], () => process.exit(0));

    this.createHeader();
    this.createDashboard();
    this.createButtons();
    this.createTables();
  }

  createButtons() {
    const projectLabel = "Projects";
    const workspaceLabel = "Workspaces";

    const projectsButtonWidth = this.getTextWidth(projectLabel, {
      left: 1,
      right: 1,
    });
    const workspacesButtonWidth = this.getTextWidth(workspaceLabel, {
      left: 1,
      right: 1,
    });
    const totalWidth = projectsButtonWidth + workspacesButtonWidth + 10;
    const leftOffset = (this.screen.width - totalWidth) / 2;

    this.projectsButton = blessed.button({
      content: projectLabel,
      keys: true,
      left: leftOffset,
      mouse: true,
      name: "projects",
      padding: { left: 1, right: 1 },
      parent: this.screen,
      shrink: true,
      style: {
        focus: {
          bg: "green",
        },
        hover: {
          bg: "cyan",
        },
      },
      top: 2,
    });

    this.workspacesButton = blessed.button({
      content: workspaceLabel,
      keys: true,
      left: leftOffset + projectsButtonWidth + 10,
      mouse: true,
      name: "workspaces",
      padding: { left: 1, right: 1 },
      parent: this.screen,
      shrink: true,
      style: {
        focus: {
          bg: "green",
        },
        hover: {
          bg: "cyan",
        },
      },
      top: 2,
    });

    this.projectsButton.on("press", () => this.showProjectsTable());
    this.workspacesButton.on("press", () => this.showWorkspacesTable());

    this.setupButtonNavigation();
  }

  createDashboard() {
    this.dashboard = blessed.box({
      alwaysScroll: true,
      border: { type: "line" },
      height: "100%-4",
      label: " ISSUES ",
      left: 0,
      parent: this.screen,
      scrollable: true,
      scrollbar: {
        ch: " ",
        inverse: true,
      },
      style: {
        bg: "black",
        border: {
          fg: "yellow",
        },
        fg: "white",
      },
      top: 4,
      width: "100%",
    });
  }

  createHeader() {
    this.header = blessed.box({
      align: "center",
      content: "Cinnabar Forge Anna",
      height: 1,
      left: "center",
      parent: this.screen,
      style: {
        bg: "red",
        bold: true,
        fg: "white",
      },
      top: 0,
      width: "100%",
    });
  }

  createTables() {}

  getTextWidth(text, padding) {
    return text.length + padding.left + padding.right;
  }

  hideDashboardAndButtons() {
    this.dashboard.hide();
    this.projectsButton.hide();
    this.workspacesButton.hide();
    this.screen.render();
  }

  setupButtonNavigation() {
    this.projectsButton.focus();

    this.projectsButton.key("right", () => {
      this.workspacesButton.focus();
    });

    this.workspacesButton.key("left", () => {
      this.projectsButton.focus();
    });

    this.projectsButton.on("focus", () => this.screen.render());
    this.workspacesButton.on("focus", () => this.screen.render());
  }

  showDashboardAndButtons() {
    this.projectsTable?.hide();
    this.workspacesTable?.hide();
    this.dashboard.show();
    this.projectsButton.show();
    this.workspacesButton.show();
    this.screen.render();
  }

  showProjectsTable(projects = []) {
    this.hideDashboardAndButtons();

    const headers = ["Name", "Description"];
    const rows = projects.map((project) => [
      project.name,
      project.description || "No description",
    ]);
    const data = [headers, ...rows];
    
    this.showTable("projectsTable", "projectsButton", "PROJECTS", data);
  }

  showTable(table, button, typeLabel, data) {
    this.hideDashboardAndButtons();

    const label = `${typeLabel} (${data.length - 1})`;

    if (this[table] != null) {
      this[table].show();
      this[table].setData(data);
      this[table].setLabel(label);
      this[table].focus();
      this.screen.render();
      return;
    }

    this[table] = blessed.listtable({
      align: "left",
      border: { type: "line" },
      data: data,
      height: "100%-2",
      keys: true,
      label: label,
      left: 0,
      mouse: true,
      parent: this.screen,
      style: {
        border: { fg: "yellow" },
        cell: { fg: "white", selected: { bg: "green" } },
        header: { bold: true, fg: "green" },
      },
      top: 2,
      width: "100%",
    });

    this[table].focus();
    // eslint-disable-next-line no-unused-vars
    this[table].on("select", (item, index) => {
      this.showDashboardAndButtons();
      this[button].focus();
    });

    this.screen.render();

    this[table].key(["escape"], () => {
      this.showDashboardAndButtons();
      this[button].focus();
    });
  }

  showWorkspacesTable(workspaces = []) {
    const headers = ["Folder", "Name", "Stack", "Version", "Git repo"];
    const rows = workspaces.map((workspace) => [
      workspace.folder,
      workspace.name,
      workspace.stack || "Unknown",
      "-",
      (workspace.gitRepo ? "Yes" : "No") +
        (workspace.gitProds && workspace.gitProds.length > 0
          ? ` +${workspace.gitProds.length} prod`
          : ""),
    ]);
    const data = [headers, ...rows];

    this.showTable("workspacesTable", "workspacesButton", "WORKSPACES", data);
  }

  updateDashboard(content) {
    this.dashboard.setContent(content);
    this.screen.render();
  }
}
