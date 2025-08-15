# ZIG-CC-IS-GOD
*zig-cc-is-god* is a CMake toolchain generator for zig-cc / zig-c++.

## As CLI
To list all available targets (`zig` installation required),
```sh
bunx zig-cc-is-god
```

To generate toolchain files,
```sh
bunx zig-cc-is-god -t aarch64-macos-none x86_64-macos-none -o toolchains
```
