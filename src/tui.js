/* eslint-disable security/detect-object-injection */
import blessed from "blessed";

export class Tui {
  constructor(config, workspacesManager) {
    this.config = config;
    this.workspacesManager = workspacesManager;
    this.screen = blessed.screen({
      smartCSR: true,
      title: "Cinnabar Forge Anna",
    });
    // eslint-disable-next-line no-process-exit
    this.screen.key(["C-c"], () => process.exit(0));

    this.createHeader();
    // this.createDashboard();
    this.createButtons();
    this.createTables();

    this.screen.render();
  }

  createButton(name, workspaceLabel, left) {
    return blessed.button({
      content: workspaceLabel,
      keys: true,
      left: left,
      // mouse: true,
      name: "workspaces",
      parent: this.screen,
      shrink: true,
      style: {
        focus: {
          bg: "green",
        },
        // hover: {
        //   bg: "cyan",
        // },
      },
      top: "center",
    });
  }

  createButtons() {
    const projectLabel = "[Projects]";
    const workspaceLabel = "[Workspaces]";

    const projectsButtonWidth = this.getTextWidth(projectLabel);
    const workspacesButtonWidth = this.getTextWidth(workspaceLabel);
    const totalWidth = projectsButtonWidth + workspacesButtonWidth + 10;
    const leftOffset = (this.screen.width - totalWidth) / 2;

    this.projectsButton = this.createButton(
      "projects",
      projectLabel,
      leftOffset,
    );
    this.workspacesButton = this.createButton(
      "workspaces",
      workspaceLabel,
      leftOffset + projectsButtonWidth + 10,
    );

    this.projectsButton.on("press", () => {
      this.showProjectsTable();
    });

    this.workspacesButton.on("press", () => {
      this.showWorkspacesTable();
    });

    this.setupButtonNavigation();
  }

  createDashboard() {
    this.dashboard = blessed.box({
      alwaysScroll: true,
      border: { type: "line" },
      height: "100%-4",
      label: "ISSUES",
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
      content: "Cinnabar Forge Anna " + this.config.versionella.versionText,
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

  devActions(item, index) {
    const options = [
      { label: "Option1", name: "option1" },
      { label: "Option2", name: "option2" },
    ];
    const title = `${index}`;

    this.showListPopup(title, options);
  }

  getTextWidth(text, padding) {
    return text.length + (padding?.left || 0) + (padding?.right || 0);
  }

  hideDashboardAndButtons() {
    this.dashboard?.hide();
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

  showConfirmationPopup(parentTitle, message, callback) {
    const form = blessed.form({
      border: { type: "line" },
      height: 12,
      keys: true,
      label: parentTitle,
      left: "center",
      parent: this.screen,
      style: { border: { fg: "yellow" } },
      top: "center",
      width: "50%",
    });

    blessed.text({
      content: message,
      height: 1,
      left: 2,
      parent: form,
      top: 2,
    });

    const submitButton = blessed.button({
      bottom: 2,
      content: "[OK]",
      keys: true,
      left: "center",
      // mouse: true,
      name: "submit",
      parent: form,
      shrink: true,
      style: {
        focus: { bg: "green" },
        // hover: { bg: "green" }
      },
    });

    const cancelButton = blessed.button({
      bottom: 0,
      content: "[Cancel]",
      keys: true,
      left: "center",
      // mouse: true,
      name: "cancel",
      parent: form,
      shrink: true,
      style: {
        focus: { bg: "red" },
        // hover: { bg: "red" }
      },
    });
    cancelButton.focus();

    submitButton.on("press", async () => {
      await callback();
      form.destroy();
      this.screen.render();
    });

    cancelButton.on("press", async () => {
      await callback("Canceled");
      form.destroy();
      this.screen.render();
    });

    form.on("submit", async () => {
      await callback();
      form.destroy();
      this.screen.render();
    });

    form.key(["escape"], async () => {
      await callback("Canceled");
      form.destroy();
      this.screen.render();
    });

    this.screen.render();
  }

  showDashboardAndButtons() {
    this.projectsTable?.hide();
    this.workspacesTable?.hide();
    this.dashboard?.show();
    this.projectsButton.show();
    this.workspacesButton.show();
    this.screen.render();
  }

  showInputBox(parentTitle, description, value, callback) {
    const form = blessed.form({
      border: { type: "line" },
      height: "50%",
      keys: true,
      label: parentTitle,
      left: "center",
      parent: this.screen,
      style: { border: { fg: "yellow" } },
      top: "center",
      width: "50%",
    });

    blessed.text({
      content: description,
      height: 1,
      left: 2,
      parent: form,
      top: 2,
    });

    const input = blessed.textbox({
      border: { type: "line" },
      height: 3,
      inputOnFocus: true,
      keys: true,
      left: "center",
      // mouse: true,
      parent: form,
      style: {
        bg: "black",
        border: { fg: "yellow" },
        fg: "white",
        focus: { border: { fg: "red" } },
      },
      top: 4,
      width: "90%",
    });

    if (value) input.setValue(value);
    input.focus();

    const submitButton = blessed.button({
      bottom: 0,
      content: "[OK]",
      keys: true,
      left: 3,
      // mouse: true,
      name: "submit",
      parent: form,
      shrink: true,
      style: {
        focus: { bg: "green" },
        // hover: { bg: "green" }
      },
    });

    const resetButton = blessed.button({
      bottom: 0,
      content: "[Reset]",
      keys: true,
      left: "center",
      // mouse: true,
      name: "reset",
      parent: form,
      shrink: true,
      style: {
        focus: { bg: "blue" },
        // hover: { bg: "blue" }
      },
    });

    const cancelButton = blessed.button({
      bottom: 0,
      content: "[Cancel]",
      keys: true,
      // mouse: true,
      name: "cancel",
      parent: form,
      right: 3,
      shrink: true,
      style: {
        focus: { bg: "red" },
        // hover: { bg: "red" }
      },
    });

    submitButton.on("press", () => {
      form.destroy();
      this.screen.render();
      callback(null, input.getValue());
    });

    resetButton.on("press", () => {
      input.setValue(value || "");
      input.focus();
      this.screen.render();
    });

    cancelButton.on("press", () => {
      form.destroy();
      this.screen.render();
      callback("Canceled", null);
    });

    form.on("submit", () => {
      form.destroy();
      this.screen.render();
      callback(null, input.getValue());
    });

    form.key(["escape"], () => {
      form.destroy();
      this.screen.render();
      callback("Canceled", null);
    });

    this.screen.render();
  }

  showListPopup(title, options) {
    const items = [];
    for (const option of options) {
      items.push(option.label || option.name);
    }

    const listPopup = blessed.list({
      align: "center",
      border: { type: "line" },
      height: "50%",
      items: items,
      keys: true,
      label: title,
      left: "center",
      // mouse: true,
      parent: this.screen,
      style: {
        border: { fg: "yellow" },
        selected: { bg: "green", fg: "white" },
      },
      top: "center",
      vi: true,
      width: "25%",
    });

    listPopup.on("select", (item, index) => {
      listPopup.destroy();
      this.screen.render();
      if (options[index]?.callback != null) {
        options[index].callback(options[index]);
      }
    });

    listPopup.key(["escape"], () => {
      listPopup.destroy();
      this.screen.render();
    });

    listPopup.focus();
    this.screen.render();
  }

  showProjectsTable() {
    this.hideDashboardAndButtons();

    const headers = ["Name"];
    const rows = this.config.projects.map((project) => [project.name]);
    this.projectsData = [headers, ...rows];

    this.showTable(
      "PROJECTS",
      "projectsTable",
      "projectsData",
      "projectsButton",
      this.devActions,
    );
  }

  showTable(typeLabel, table, data, button, callback) {
    this.hideDashboardAndButtons();

    const label = `${typeLabel} (${this[data].length - 1})`;

    if (this[table] != null) {
      this[table].show();
      this[table].setData(this[data]);
      this[table].setLabel(label);
      this[table].focus();
      this.screen.render();
      return;
    }

    this[table] = blessed.listtable({
      align: "left",
      border: { type: "line" },
      data: this[data],
      height: "100%-2",
      keys: true,
      label: label,
      left: 0,
      // mouse: true,
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
    this[table].on("select", callback);

    this.screen.render();

    this[table].key(["escape"], () => {
      this.showDashboardAndButtons();
      this[button].focus();
    });
  }

  async showWorkspacesTable() {
    const workspacesData = [["Folder", "Name", "Stack", "Version", "Status"]];

    for (const workspace of this.config.workspaces) {
      const row = [];
      row.push(
        workspace.folder,
        workspace.name,
        workspace.stack || "Unknown",
        "-",
        (await this.workspacesManager.determineWorkspaceStatus(workspace)).join(
          ", ",
        ),
      );
      workspacesData.push(row);
    }

    this.workspacesData = workspacesData;

    this.showTable(
      "WORKSPACES",
      "workspacesTable",
      "workspacesData",
      "workspacesButton",
      (item, index) => {
        this.workspaceActions(this.config.workspaces[index - 1]);
      },
    );
  }

  updateDashboard(content) {
    this.dashboard?.setContent(content);
    this.screen.render();
  }

  async workspaceActions(workspace) {
    const title = `${workspace.name}`;
    const options = [
      // {
      //   callback: (option) => {
      //     this.showInputBox(title, option.label, workspace.gitRepo, () => {});
      //   },
      //   label: "Change git repo",
      //   name: "changeGitRepo",
      // },
      // {
      //   callback: (option) => {
      //     this.showInputBox(title, option.label, workspace.stack, () => {});
      //   },
      //   label: "Change stack",
      //   name: "changeStack",
      // },
      // {
      //   callback: (option) => {
      //     this.showInputBox(
      //       title,
      //       option.label,
      //       workspace.convention,
      //       () => {},
      //     );
      //   },
      //   label: "Change convention",
      //   name: "changeConvention",
      // },
    ];
    const statuses =
      await this.workspacesManager.determineWorkspaceStatus(workspace);

    for (const status of statuses) {
      if (status === "-") {
        if (workspace.gitRepo != null) {
          options.push({
            callback: (option) => {
              this.showConfirmationPopup(title, option.label, async () => {
                await this.workspacesManager.syncWorkspace(
                  workspace,
                  false,
                  false,
                  true,
                );
                this.showWorkspacesTable();
              });
            },
            label: "Clone git repo",
            name: "cloneGitRepo",
          });
        } else {
          // options.push({ label: "Create folder", name: "createFolder" });
        }
      }
    }

    this.showListPopup(title, options);
  }
}
