// import replace from '@rollup/plugin-replace';

function createGlobalPlugins(release) {
    return [
        // replace({
        //     preventAssignment: true,
        //     values: {
        //         "process.env.NODE_ENV": JSON.stringify(release ? "production" : "development")
        //     }
        // })
    ];
}

export default [
    {
        input: "./dist/module/index.js",
        output: {
            // support core api for emscripten implementation
            file: "./public/index.js",
            format: "iife",
            compact: true,
            sourcemap: true
        },
        plugins: createGlobalPlugins(true)
    }
];