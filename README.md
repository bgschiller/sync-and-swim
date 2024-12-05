# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Compile flags

I found that I needed to install `gcc` and set a few environment variables in order to get this to compile:

```bash
export MACOSX_DEPLOYMENT_TARGET=10.13
export RUSTFLAGS="-C linker=/opt/homebrew/opt/gcc@14/bin/gcc-14"
```

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
