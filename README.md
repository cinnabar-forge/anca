# Cinnabar Forge Workfolder

Organize your workspace fast and easy.

## Getting Started

### Installation

#### Binary

If you don't have Python installed or prefer not to install extra software, we provide ready-to-use binaries in a portable/bundle version. These binaries allow you to launch the app directly without any additional setup, making it easy to use and share.

You can find the latest sources and prebuilt binaries here: <https://github.com/cinnabar-forge/cf-workfolder/releases/latest>

#### Source code

As this app is written in Python, you also have the option to launch it directly from the source code. This gives you the flexibility to customize and explore the app further using Python, and is particularly useful for developers or users who are familiar with the Python environment.

##### Prerequisites

Make sure you have Python 3.x installed on your system. You can download Python from the official website: <https://www.python.org/downloads/>

##### Installation

```bash
git clone git@github.com:cinnabar-forge/cf-workfolder.git
pip install -r requirements.txt
cd cf-workfolder
```

### Configuration



## Changelog

We curate a human-readable changelog. You can find it in the [CHANGELOG.md](CHANGELOG.md) file.

## License

This project is licensed under the **ISC License**, see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Feel free to open an issue or create a pull request.

### Build binaries

```bash
pyinstaller --onefile --clean -y -n "cf-workfolder" --add-data="version.json;." index.py
```

## Authors

- Timur Moziev ([@TimurRin](https://github.com/TimurRin))
