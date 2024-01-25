import subprocess
import sys
import os
import json
import datetime
import inquirer
import pathlib


def execute_system_commands(execution_path, system_commands):
    for command in system_commands:
        print(command)
        subprocess.Popen(
            command, stdout=subprocess.PIPE, cwd=execution_path
        ).communicate()[0]


working_folder_path = (
    getattr(sys, "frozen", False) and os.path.dirname(sys.executable)
) or os.path.dirname(os.path.abspath(__file__))

CF_VERSION_PATH = os.path.join(working_folder_path, "version.json")
CONFIG_PATH = os.path.join(working_folder_path, "config.json")

with open(CF_VERSION_PATH, mode="r", encoding="utf-8") as file:
    cf_version_data = json.load(file)
    print(
        f"\n\n{cf_version_data['package']}@{cf_version_data['major']}.{cf_version_data['minor']}.{cf_version_data['patch']} (r{cf_version_data['revision']}) from {datetime.datetime.fromtimestamp(cf_version_data['timestamp'])}\n\n"
    )

with open(CONFIG_PATH, mode="r", encoding="utf-8") as file:
    try:
        config = json.load(file)
    except:
        config = {}

config = inquirer.prompt(
    [
        inquirer.Path(
            "work_folder",
            message="Please specify work folder",
            path_type=inquirer.Path.DIRECTORY,
            default=(config.get("work_folder", None)),
        ),
        inquirer.Path(
            "work_config",
            message="Please specify work config",
            path_type=inquirer.Path.FILE,
            default=(config.get("work_config", None)),
        ),
    ]
)


def form_path(type, project_name):
    return os.path.join(config["work_folder"], "workspaces", project_name)


with open(CONFIG_PATH, "w", encoding="utf-8") as file:
    json.dump(config, file, ensure_ascii=False, indent=4)
    file.write("\n")

with open(config["work_config"], mode="r", encoding="utf-8") as file:
    work_config = json.load(file)


def process_workspaces():
    print("\n\n[WORKSPACES]")
    if not len(work_config["workspaces"]):
        print("\nNo workspaces found")
        return
    for workspaceIndex, workspace in enumerate(work_config["workspaces"]):
        workspace_path = form_path("workspace", workspace["name"])
        print(
            f"\n{workspaceIndex + 1}. Processing: '{workspace['name']}' ({workspace_path})..."
        )
        pathlib.Path(workspace_path).mkdir(parents=True, exist_ok=True)
        git_repo_url = workspace["gitRepo"]
        git_path = os.path.join(workspace_path, ".git")

        commands = []

        if not os.path.exists(git_path):
            print(f"    Init git repo...")
            commands.append(("git", "init"))
            commands.append(("git", "remote", "add", "origin", git_repo_url))
            commands.append(("git", "pull", "origin", "master"))
        else:
            print(f"    Found git repo")

        execute_system_commands(workspace_path, commands)


def process_projects():
    print("\n\n[PROJECTS]")
    if not len(work_config["projects"]):
        print("\nNo projects found")
        return
    for projectIndex, project in enumerate(work_config["projects"]):
        project_path = form_path("project", project["name"])
        print(
            f"\n{projectIndex + 1}. Processing: '{project['name']}' ({project_path})..."
        )


process_workspaces()
# process_projects()

print("\n\nYour work folder has been set up successfully")
