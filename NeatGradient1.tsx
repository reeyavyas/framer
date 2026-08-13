// Imported straight from a CDN as an ES module, so Framer needs no npm
// install step at all — if that ever breaks, swap for the bare specifier
// "@firecms/neat" and install it via Framer's package manager instead.
import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType } from "framer"
import { NeatGradient } from "https://esm.sh/@firecms/neat@1.0.2"

// Framer's Color control emits "rgba(r, g, b, a)" once a swatch has been
// touched in the picker, not just hex. NeatGradient's own color parsing only
// understands "#rrggbb" and silently falls back to black on anything else,
// which is why edited colors were rendering black. Normalize to hex first.
function toHex(input: string): string {
    if (!input) return "#000000"
    if (input[0] === "#") {
        let hex = input.slice(1)
        if (hex.length === 3) {
            hex = hex.split("").map((ch) => ch + ch).join("")
        }
        return "#" + hex.slice(0, 6).padEnd(6, "0")
    }
    const match = input.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
    if (match) {
        const [r, g, b] = match
            .slice(1, 4)
            .map((v) => Math.max(0, Math.min(255, Math.round(parseFloat(v)))))
        return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")
    }
    return input
}

function buildNeatConfig(props: any) {
    const {
        colors = [],
        movement,
        secondaryWave,
        light,
        background,
        grain,
        flow,
        scrollOffset,
        texture,
        domainWarp,
        vignette,
        fresnel,
        iridescence,
        prismEdge,
        bloom,
        shape,
        camera,
        advanced,
    } = props

    return {
        colors: colors.map((c: any) => ({
            color: toHex(c.color),
            enabled: c.enabled,
            influence: c.influence,
        })),

        speed: movement.speed,
        horizontalPressure: movement.horizontalPressure,
        verticalPressure: movement.verticalPressure,
        waveFrequencyX: movement.waveFrequencyX,
        waveFrequencyY: movement.waveFrequencyY,
        waveAmplitude: movement.waveAmplitude,

        secondaryWaveEnabled: secondaryWave.enabled,
        secondaryWaveFrequencyX: secondaryWave.frequencyX,
        secondaryWaveFrequencyY: secondaryWave.frequencyY,
        secondaryWaveAmplitude: secondaryWave.amplitude,
        secondaryWaveSpeed: secondaryWave.speed,
        secondaryWaveAngle: secondaryWave.angle,

        shadows: light.shadows,
        highlights: light.highlights,
        colorBrightness: light.colorBrightness,
        colorSaturation: light.colorSaturation,
        colorBlending: light.colorBlending,
        wireframe: light.wireframe,
        flatShading: light.flatShading,

        backgroundColor: toHex(background.color),
        backgroundAlpha: background.alpha,

        grainScale: grain.scale,
        grainIntensity: grain.intensity,
        grainSparsity: grain.sparsity,
        grainSpeed: grain.speed,

        flowEnabled: flow.enabled,
        flowDistortionA: flow.distortionA,
        flowDistortionB: flow.distortionB,
        flowScale: flow.scale,
        flowEase: flow.ease,

        yOffset: scrollOffset.yOffset,
        yOffsetWaveMultiplier: scrollOffset.waveMultiplier,
        yOffsetColorMultiplier: scrollOffset.colorMultiplier,
        yOffsetFlowMultiplier: scrollOffset.flowMultiplier,

        enableProceduralTexture: texture.enabled,
        textureMode: texture.mode,
        transparentTextureVoid: texture.transparentVoid,
        bakeEdgeSoftness: texture.bakeEdgeSoftness,
        textureVoidLikelihood: texture.voidLikelihood,
        textureVoidWidthMin: texture.voidWidthMin,
        textureVoidWidthMax: texture.voidWidthMax,
        textureBandDensity: texture.bandDensity,
        textureColorBlending: texture.colorBlending,
        textureSeed: texture.seed,
        textureEase: texture.ease,
        proceduralBackgroundColor: toHex(texture.backgroundColor),
        textureShapeTriangles: texture.shapeTriangles,
        textureShapeCircles: texture.shapeCircles,
        textureShapeBars: texture.shapeBars,
        textureShapeSquiggles: texture.shapeSquiggles,

        domainWarpEnabled: domainWarp.enabled,
        domainWarpIntensity: domainWarp.intensity,
        domainWarpScale: domainWarp.scale,

        vignetteIntensity: vignette.intensity,
        vignetteRadius: vignette.radius,

        fresnelEnabled: fresnel.enabled,
        fresnelPower: fresnel.power,
        fresnelIntensity: fresnel.intensity,
        fresnelColor: toHex(fresnel.color),

        iridescenceEnabled: iridescence.enabled,
        iridescenceIntensity: iridescence.intensity,
        iridescenceSpeed: iridescence.speed,

        prismEdgeEnabled: prismEdge.enabled,
        prismEdgeIntensity: prismEdge.intensity,
        prismEdgeThinness: prismEdge.thinness,
        prismEdgeSpread: prismEdge.spread,
        prismEdgeSpeed: prismEdge.speed,
        prismEdgeRipple: prismEdge.ripple,

        bloomIntensity: bloom.intensity,
        bloomThreshold: bloom.threshold,
        chromaticAberration: bloom.chromaticAberration,

        shapeType: shape.type,
        shapeRotationX: shape.rotationX,
        shapeRotationY: shape.rotationY,
        shapeRotationZ: shape.rotationZ,
        shapeAutoRotateSpeedX: shape.autoRotateSpeedX,
        shapeAutoRotateSpeedY: shape.autoRotateSpeedY,
        sphereRadius: shape.sphereRadius,
        torusRadius: shape.torusRadius,
        torusTube: shape.torusTube,
        cylinderRadius: shape.cylinderRadius,
        cylinderHeight: shape.cylinderHeight,
        planeBend: shape.planeBend,
        planeTwist: shape.planeTwist,
        silhouetteFade: shape.silhouetteFade,
        cylinderFade: shape.cylinderFade,
        ribbonFade: shape.ribbonFade,

        cameraLock: camera.lock,
        cameraX: camera.x,
        cameraY: camera.y,
        cameraZ: camera.z,
        cameraRotationX: camera.rotationX,
        cameraRotationY: camera.rotationY,
        cameraRotationZ: camera.rotationZ,
        cameraZoom: camera.zoom,

        resolution: advanced.resolution,
        renderScale: advanced.renderScale,
        antialias: advanced.antialias,
        licenseKey: advanced.licenseKey || undefined,
    }
}

export default function NeatGradient1(props: any) {
    const { style, ...rest } = props
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const gradientRef = useRef<InstanceType<typeof NeatGradient> | null>(null)
    const config = buildNeatConfig(rest)

    useEffect(() => {
        if (!canvasRef.current) return
        const gradient = new NeatGradient({ ref: canvasRef.current, ...config })
        gradientRef.current = gradient
        return () => {
            gradient.destroy()
            gradientRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        const gradient = gradientRef.current
        if (!gradient) return
        Object.assign(gradient, config)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(config)])

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: "100%",
                height: "100%",
                display: "block",
                ...style,
            }}
        />
    )
}

addPropertyControls(NeatGradient1, {
    colors: {
        type: ControlType.Array,
        title: "Colors",
        maxCount: 6,
        control: {
            type: ControlType.Object,
            controls: {
                color: { type: ControlType.Color, defaultValue: "#169592" },
                enabled: { type: ControlType.Boolean, defaultValue: true },
                influence: {
                    type: ControlType.Number,
                    defaultValue: 1,
                    min: 0,
                    max: 2,
                    step: 0.05,
                },
            },
        },
        defaultValue: [
            { color: "#169592", enabled: true, influence: 1 },
            { color: "#06BFBC", enabled: true, influence: 1 },
            { color: "#00615E", enabled: true, influence: 1 },
            { color: "#059390", enabled: true, influence: 1 },
            { color: "#BCE2D7", enabled: true, influence: 1 },
            { color: "#06605E", enabled: true, influence: 1 },
        ],
    },

    movement: {
        type: ControlType.Object,
        title: "Waves",
        controls: {
            speed: { type: ControlType.Number, defaultValue: 2.5, min: 0, max: 20, step: 0.1 },
            horizontalPressure: { type: ControlType.Number, defaultValue: 3, min: 0, max: 10, step: 0.1 },
            verticalPressure: { type: ControlType.Number, defaultValue: 4, min: 0, max: 10, step: 0.1 },
            waveFrequencyX: { type: ControlType.Number, defaultValue: 2, min: 0, max: 25, step: 0.1 },
            waveFrequencyY: { type: ControlType.Number, defaultValue: 3, min: 0, max: 25, step: 0.1 },
            waveAmplitude: { type: ControlType.Number, defaultValue: 5, min: 0, max: 20, step: 0.1 },
        },
    },

    secondaryWave: {
        type: ControlType.Object,
        title: "Secondary Wave",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: false },
            frequencyX: { type: ControlType.Number, defaultValue: 3, min: 0, max: 25, step: 0.1 },
            frequencyY: { type: ControlType.Number, defaultValue: 3, min: 0, max: 25, step: 0.1 },
            amplitude: { type: ControlType.Number, defaultValue: 5, min: 0, max: 20, step: 0.1 },
            speed: { type: ControlType.Number, defaultValue: 0.6, min: 0, max: 5, step: 0.05 },
            angle: { type: ControlType.Number, defaultValue: 1, min: 0, max: 6.283, step: 0.05 },
        },
    },

    light: {
        type: ControlType.Object,
        title: "Light & Color",
        controls: {
            shadows: { type: ControlType.Number, defaultValue: 1, min: 0, max: 10, step: 0.1 },
            highlights: { type: ControlType.Number, defaultValue: 5, min: 0, max: 10, step: 0.1 },
            colorBrightness: { type: ControlType.Number, defaultValue: 1, min: 0, max: 2, step: 0.05 },
            colorSaturation: { type: ControlType.Number, defaultValue: 7, min: 0, max: 10, step: 0.1 },
            colorBlending: { type: ControlType.Number, defaultValue: 8, min: 0, max: 10, step: 0.1 },
            wireframe: { type: ControlType.Boolean, defaultValue: false },
            flatShading: { type: ControlType.Boolean, defaultValue: true },
        },
    },

    background: {
        type: ControlType.Object,
        title: "Background",
        controls: {
            color: { type: ControlType.Color, defaultValue: "#003FFF" },
            alpha: { type: ControlType.Number, defaultValue: 1, min: 0, max: 1, step: 0.01 },
        },
    },

    grain: {
        type: ControlType.Object,
        title: "Grain",
        controls: {
            scale: { type: ControlType.Number, defaultValue: 0, min: 0, max: 10, step: 0.1 },
            intensity: { type: ControlType.Number, defaultValue: 0, min: 0, max: 1, step: 0.01 },
            sparsity: { type: ControlType.Number, defaultValue: 0, min: 0, max: 1, step: 0.01 },
            speed: { type: ControlType.Number, defaultValue: 1, min: 0, max: 5, step: 0.05 },
        },
    },

    flow: {
        type: ControlType.Object,
        title: "Flow",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: true },
            distortionA: { type: ControlType.Number, defaultValue: 3.7, min: 0, max: 10, step: 0.1 },
            distortionB: { type: ControlType.Number, defaultValue: 1.4, min: 0, max: 10, step: 0.1 },
            scale: { type: ControlType.Number, defaultValue: 2.9, min: 0, max: 10, step: 0.1 },
            ease: { type: ControlType.Number, defaultValue: 0.32, min: 0, max: 1, step: 0.01 },
        },
    },

    scrollOffset: {
        type: ControlType.Object,
        title: "Y Offset",
        controls: {
            yOffset: { type: ControlType.Number, defaultValue: 0, min: -2000, max: 2000, step: 1 },
            waveMultiplier: { type: ControlType.Number, defaultValue: 4, min: 0, max: 20, step: 0.1 },
            colorMultiplier: { type: ControlType.Number, defaultValue: 4, min: 0, max: 20, step: 0.1 },
            flowMultiplier: { type: ControlType.Number, defaultValue: 4, min: 0, max: 20, step: 0.1 },
        },
    },

    texture: {
        type: ControlType.Object,
        title: "Texture",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: false },
            mode: {
                type: ControlType.Enum,
                defaultValue: "bitmap",
                options: ["bitmap", "baked"],
                optionTitles: ["Bitmap", "Baked"],
            },
            transparentVoid: { type: ControlType.Boolean, defaultValue: false },
            bakeEdgeSoftness: { type: ControlType.Number, defaultValue: 1, min: 0, max: 5, step: 0.1 },
            voidLikelihood: { type: ControlType.Number, defaultValue: 0.27, min: 0, max: 1, step: 0.01 },
            voidWidthMin: { type: ControlType.Number, defaultValue: 60, min: 0, max: 2000, step: 1 },
            voidWidthMax: { type: ControlType.Number, defaultValue: 420, min: 0, max: 2000, step: 1 },
            bandDensity: { type: ControlType.Number, defaultValue: 1.2, min: 0, max: 10, step: 0.05 },
            colorBlending: { type: ControlType.Number, defaultValue: 0.06, min: 0, max: 1, step: 0.01 },
            seed: { type: ControlType.Number, defaultValue: 333, min: 0, max: 10000, step: 1 },
            ease: { type: ControlType.Number, defaultValue: 0.5, min: 0, max: 1, step: 0.01 },
            backgroundColor: { type: ControlType.Color, defaultValue: "#0E0707" },
            shapeTriangles: { type: ControlType.Number, defaultValue: 20, min: 0, max: 100, step: 1 },
            shapeCircles: { type: ControlType.Number, defaultValue: 15, min: 0, max: 100, step: 1 },
            shapeBars: { type: ControlType.Number, defaultValue: 15, min: 0, max: 100, step: 1 },
            shapeSquiggles: { type: ControlType.Number, defaultValue: 10, min: 0, max: 100, step: 1 },
        },
    },

    domainWarp: {
        type: ControlType.Object,
        title: "Domain Warp",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: false },
            intensity: { type: ControlType.Number, defaultValue: 0, min: 0, max: 5, step: 0.05 },
            scale: { type: ControlType.Number, defaultValue: 3, min: 0, max: 10, step: 0.1 },
        },
    },

    vignette: {
        type: ControlType.Object,
        title: "Vignette",
        controls: {
            intensity: { type: ControlType.Number, defaultValue: 0, min: 0, max: 2, step: 0.05 },
            radius: { type: ControlType.Number, defaultValue: 0.8, min: 0, max: 2, step: 0.05 },
        },
    },

    fresnel: {
        type: ControlType.Object,
        title: "Fresnel",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: false },
            power: { type: ControlType.Number, defaultValue: 2, min: 0, max: 10, step: 0.1 },
            intensity: { type: ControlType.Number, defaultValue: 0.5, min: 0, max: 2, step: 0.05 },
            color: { type: ControlType.Color, defaultValue: "#FFFFFF" },
        },
    },

    iridescence: {
        type: ControlType.Object,
        title: "Iridescence",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: false },
            intensity: { type: ControlType.Number, defaultValue: 0.5, min: 0, max: 2, step: 0.05 },
            speed: { type: ControlType.Number, defaultValue: 1, min: 0, max: 5, step: 0.05 },
        },
    },

    prismEdge: {
        type: ControlType.Object,
        title: "Prism Edge",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: false },
            intensity: { type: ControlType.Number, defaultValue: 0.5, min: 0, max: 2, step: 0.05 },
            thinness: { type: ControlType.Number, defaultValue: 3, min: 0, max: 10, step: 0.1 },
            spread: { type: ControlType.Number, defaultValue: 1, min: 0, max: 5, step: 0.05 },
            speed: { type: ControlType.Number, defaultValue: 0.5, min: 0, max: 5, step: 0.05 },
            ripple: { type: ControlType.Number, defaultValue: 1, min: 0, max: 5, step: 0.05 },
        },
    },

    bloom: {
        type: ControlType.Object,
        title: "Bloom & Aberration",
        controls: {
            intensity: { type: ControlType.Number, defaultValue: 0, min: 0, max: 2, step: 0.05 },
            threshold: { type: ControlType.Number, defaultValue: 0.7, min: 0, max: 1, step: 0.01 },
            chromaticAberration: { type: ControlType.Number, defaultValue: 0, min: 0, max: 2, step: 0.05 },
        },
    },

    shape: {
        type: ControlType.Object,
        title: "Shape (3D)",
        controls: {
            type: {
                type: ControlType.Enum,
                defaultValue: "plane",
                options: ["plane", "sphere", "torus", "cylinder", "ribbon"],
                optionTitles: ["Plane", "Sphere", "Torus", "Cylinder", "Ribbon"],
            },
            rotationX: { type: ControlType.Number, defaultValue: 0, min: 0, max: 6.283, step: 0.05 },
            rotationY: { type: ControlType.Number, defaultValue: 0, min: 0, max: 6.283, step: 0.05 },
            rotationZ: { type: ControlType.Number, defaultValue: 0, min: 0, max: 6.283, step: 0.05 },
            autoRotateSpeedX: { type: ControlType.Number, defaultValue: 0, min: -5, max: 5, step: 0.05 },
            autoRotateSpeedY: { type: ControlType.Number, defaultValue: 0, min: -5, max: 5, step: 0.05 },
            sphereRadius: { type: ControlType.Number, defaultValue: 15, min: 0, max: 50, step: 0.5 },
            torusRadius: { type: ControlType.Number, defaultValue: 15, min: 0, max: 50, step: 0.5 },
            torusTube: { type: ControlType.Number, defaultValue: 5, min: 0, max: 20, step: 0.5 },
            cylinderRadius: { type: ControlType.Number, defaultValue: 10, min: 0, max: 50, step: 0.5 },
            cylinderHeight: { type: ControlType.Number, defaultValue: 40, min: 0, max: 100, step: 0.5 },
            planeBend: { type: ControlType.Number, defaultValue: 0, min: -10, max: 10, step: 0.1 },
            planeTwist: { type: ControlType.Number, defaultValue: 0, min: -10, max: 10, step: 0.1 },
            silhouetteFade: { type: ControlType.Number, defaultValue: 0.25, min: 0, max: 1, step: 0.01 },
            cylinderFade: { type: ControlType.Number, defaultValue: 0.08, min: 0, max: 1, step: 0.01 },
            ribbonFade: { type: ControlType.Number, defaultValue: 0.05, min: 0, max: 1, step: 0.01 },
        },
    },

    camera: {
        type: ControlType.Object,
        title: "Camera",
        controls: {
            lock: { type: ControlType.Boolean, defaultValue: true },
            x: { type: ControlType.Number, defaultValue: 0, min: -50, max: 50, step: 0.5 },
            y: { type: ControlType.Number, defaultValue: 0, min: -50, max: 50, step: 0.5 },
            z: { type: ControlType.Number, defaultValue: 0, min: -50, max: 50, step: 0.5 },
            rotationX: { type: ControlType.Number, defaultValue: 0, min: -6.283, max: 6.283, step: 0.05 },
            rotationY: { type: ControlType.Number, defaultValue: 0, min: -6.283, max: 6.283, step: 0.05 },
            rotationZ: { type: ControlType.Number, defaultValue: 0, min: -6.283, max: 6.283, step: 0.05 },
            zoom: { type: ControlType.Number, defaultValue: 1, min: 0.1, max: 5, step: 0.05 },
        },
    },

    advanced: {
        type: ControlType.Object,
        title: "Advanced",
        controls: {
            resolution: { type: ControlType.Number, defaultValue: 1, min: 0.1, max: 2, step: 0.05 },
            renderScale: { type: ControlType.Number, defaultValue: 1, min: 0.1, max: 3, step: 0.05 },
            antialias: { type: ControlType.Boolean, defaultValue: false },
            licenseKey: { type: ControlType.String, defaultValue: "", placeholder: "NEAT-..." },
        },
    },
});
