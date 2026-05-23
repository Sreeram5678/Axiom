// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "AxiomOS",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "axiomos", targets: ["AxiomOS"])
    ],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "AxiomOS",
            dependencies: [],
            path: "Sources/AxiomOS",
            linkerSettings: [
                .linkedFramework("Carbon"),
                .linkedFramework("Cocoa"),
                .linkedFramework("ApplicationServices")
            ]
        ),
        .testTarget(
            name: "AxiomOSTests",
            dependencies: [],
            path: "Tests/AxiomOSTests"
        )
    ]
)
