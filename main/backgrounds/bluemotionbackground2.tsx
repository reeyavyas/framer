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

// Fallback values matching the addPropertyControls defaults below. Framer's
// isolated Code File "Preview" panel has been observed to skip injecting the
// defaultValue for some controls in some rendering contexts, so every field
// falls back to one of these instead — otherwise a missing value would come
// out as NaN once multiplied by the library's internal scale factors.
const DEFAULT_CONFIG = {
    colors: [
        { color: "#002C44", enabled: true, influence: 1 },
        { color: "#015C83", enabled: true, influence: 1 },
        { color: "#11232D", enabled: true, influence: 1 },
        { color: "#ff5a5f", enabled: false, influence: 1 },
        { color: "#c81d25", enabled: false, influence: 1 },
        { color: "#A8E6CF", enabled: false, influence: 1 },
    ],
    speed: 5.5,
    horizontalPressure: 4,
    verticalPressure: 3,
    waveFrequencyX: 0,
    waveFrequencyY: 0,
    waveAmplitude: 0,
    secondaryWaveEnabled: false,
    secondaryWaveFrequencyX: 3,
    secondaryWaveFrequencyY: 3,
    secondaryWaveAmplitude: 5,
    secondaryWaveSpeed: 0.6,
    secondaryWaveAngle: 1,
    shadows: 2,
    highlights: 7,
    colorBrightness: 1,
    colorSaturation: 8,
    colorBlending: 5,
    wireframe: false,
    flatShading: true,
    backgroundColor: "#FF0000",
    backgroundAlpha: 1,
    grainScale: 0,
    grainIntensity: 0,
    grainSparsity: 0,
    grainSpeed: 0,
    flowEnabled: false,
    flowDistortionA: 5,
    flowDistortionB: 7.7,
    flowScale: 2.6,
    flowEase: 0.36,
    yOffset: 0,
    yOffsetWaveMultiplier: 1.9,
    yOffsetColorMultiplier: 1.8,
    yOffsetFlowMultiplier: 2.2,
    enableProceduralTexture: false,
    textureMode: "bitmap",
    transparentTextureVoid: false,
    bakeEdgeSoftness: 1,
    textureVoidLikelihood: 0.22,
    textureVoidWidthMin: 120,
    textureVoidWidthMax: 150,
    textureBandDensity: 1.9,
    textureColorBlending: 0.12,
    textureSeed: 333,
    textureEase: 0.75,
    proceduralBackgroundColor: "#D0DBFB",
    textureShapeTriangles: 20,
    textureShapeCircles: 15,
    textureShapeBars: 15,
    textureShapeSquiggles: 10,
    domainWarpEnabled: false,
    domainWarpIntensity: 0,
    domainWarpScale: 3,
    vignetteIntensity: 0,
    vignetteRadius: 0.8,
    fresnelEnabled: false,
    fresnelPower: 2,
    fresnelIntensity: 0.5,
    fresnelColor: "#FFFFFF",
    iridescenceEnabled: false,
    iridescenceIntensity: 0.5,
    iridescenceSpeed: 1,
    prismEdgeEnabled: false,
    prismEdgeIntensity: 0.5,
    prismEdgeThinness: 3,
    prismEdgeSpread: 1,
    prismEdgeSpeed: 0.5,
    prismEdgeRipple: 1,
    bloomIntensity: 0,
    bloomThreshold: 0.7,
    chromaticAberration: 0,
    shapeType: "plane",
    shapeRotationX: 0,
    shapeRotationY: 0,
    shapeRotationZ: 0,
    shapeAutoRotateSpeedX: 0,
    shapeAutoRotateSpeedY: 0,
    sphereRadius: 15,
    torusRadius: 15,
    torusTube: 5,
    cylinderRadius: 10,
    cylinderHeight: 40,
    planeBend: 0,
    planeTwist: 0,
    silhouetteFade: 0.25,
    cylinderFade: 0.08,
    ribbonFade: 0.05,
    cameraLock: true,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0,
    cameraRotationX: 0,
    cameraRotationY: 0,
    cameraRotationZ: 0,
    cameraZoom: 1,
    resolution: 0.5,
    renderScale: 1,
    antialias: false,
}

function buildNeatConfig(props: any) {
    const d = DEFAULT_CONFIG
    const {
        color1,
        color2,
        color3,
        color4,
        color5,
        color6,
        movement = {},
        secondaryWave = {},
        light = {},
        background = {},
        grain = {},
        flow = {},
        scrollOffset = {},
        texture = {},
        domainWarp = {},
        vignette = {},
        fresnel = {},
        iridescence = {},
        prismEdge = {},
        bloom = {},
        shape = {},
        camera = {},
        advanced = {},
    } = props ?? {}

    const colorSlots = [color1, color2, color3, color4, color5, color6]

    return {
        colors: colorSlots.map((c: any, i: number) => {
            const slot = c ?? {}
            const fallback = d.colors[i]
            return {
                color: toHex(slot.color ?? fallback.color),
                enabled: slot.enabled ?? fallback.enabled,
                influence: slot.influence ?? fallback.influence,
            }
        }),

        speed: movement.speed ?? d.speed,
        horizontalPressure: movement.horizontalPressure ?? d.horizontalPressure,
        verticalPressure: movement.verticalPressure ?? d.verticalPressure,
        waveFrequencyX: movement.waveFrequencyX ?? d.waveFrequencyX,
        waveFrequencyY: movement.waveFrequencyY ?? d.waveFrequencyY,
        waveAmplitude: movement.waveAmplitude ?? d.waveAmplitude,

        secondaryWaveEnabled: secondaryWave.enabled ?? d.secondaryWaveEnabled,
        secondaryWaveFrequencyX: secondaryWave.frequencyX ?? d.secondaryWaveFrequencyX,
        secondaryWaveFrequencyY: secondaryWave.frequencyY ?? d.secondaryWaveFrequencyY,
        secondaryWaveAmplitude: secondaryWave.amplitude ?? d.secondaryWaveAmplitude,
        secondaryWaveSpeed: secondaryWave.speed ?? d.secondaryWaveSpeed,
        secondaryWaveAngle: secondaryWave.angle ?? d.secondaryWaveAngle,

        shadows: light.shadows ?? d.shadows,
        highlights: light.highlights ?? d.highlights,
        colorBrightness: light.colorBrightness ?? d.colorBrightness,
        colorSaturation: light.colorSaturation ?? d.colorSaturation,
        colorBlending: light.colorBlending ?? d.colorBlending,
        wireframe: light.wireframe ?? d.wireframe,
        flatShading: light.flatShading ?? d.flatShading,

        backgroundColor: toHex(background.color ?? d.backgroundColor),
        backgroundAlpha: background.alpha ?? d.backgroundAlpha,

        grainScale: grain.scale ?? d.grainScale,
        grainIntensity: grain.intensity ?? d.grainIntensity,
        grainSparsity: grain.sparsity ?? d.grainSparsity,
        grainSpeed: grain.speed ?? d.grainSpeed,

        flowEnabled: flow.enabled ?? d.flowEnabled,
        flowDistortionA: flow.distortionA ?? d.flowDistortionA,
        flowDistortionB: flow.distortionB ?? d.flowDistortionB,
        flowScale: flow.scale ?? d.flowScale,
        flowEase: flow.ease ?? d.flowEase,

        yOffset: scrollOffset.yOffset ?? d.yOffset,
        yOffsetWaveMultiplier: scrollOffset.waveMultiplier ?? d.yOffsetWaveMultiplier,
        yOffsetColorMultiplier: scrollOffset.colorMultiplier ?? d.yOffsetColorMultiplier,
        yOffsetFlowMultiplier: scrollOffset.flowMultiplier ?? d.yOffsetFlowMultiplier,

        enableProceduralTexture: texture.enabled ?? d.enableProceduralTexture,
        textureMode: texture.mode ?? d.textureMode,
        transparentTextureVoid: texture.transparentVoid ?? d.transparentTextureVoid,
        bakeEdgeSoftness: texture.bakeEdgeSoftness ?? d.bakeEdgeSoftness,
        textureVoidLikelihood: texture.voidLikelihood ?? d.textureVoidLikelihood,
        textureVoidWidthMin: texture.voidWidthMin ?? d.textureVoidWidthMin,
        textureVoidWidthMax: texture.voidWidthMax ?? d.textureVoidWidthMax,
        textureBandDensity: texture.bandDensity ?? d.textureBandDensity,
        textureColorBlending: texture.colorBlending ?? d.textureColorBlending,
        textureSeed: texture.seed ?? d.textureSeed,
        textureEase: texture.ease ?? d.textureEase,
        proceduralBackgroundColor: toHex(texture.backgroundColor ?? d.proceduralBackgroundColor),
        textureShapeTriangles: texture.shapeTriangles ?? d.textureShapeTriangles,
        textureShapeCircles: texture.shapeCircles ?? d.textureShapeCircles,
        textureShapeBars: texture.shapeBars ?? d.textureShapeBars,
        textureShapeSquiggles: texture.shapeSquiggles ?? d.textureShapeSquiggles,

        domainWarpEnabled: domainWarp.enabled ?? d.domainWarpEnabled,
        domainWarpIntensity: domainWarp.intensity ?? d.domainWarpIntensity,
        domainWarpScale: domainWarp.scale ?? d.domainWarpScale,

        vignetteIntensity: vignette.intensity ?? d.vignetteIntensity,
        vignetteRadius: vignette.radius ?? d.vignetteRadius,

        fresnelEnabled: fresnel.enabled ?? d.fresnelEnabled,
        fresnelPower: fresnel.power ?? d.fresnelPower,
        fresnelIntensity: fresnel.intensity ?? d.fresnelIntensity,
        fresnelColor: toHex(fresnel.color ?? d.fresnelColor),

        iridescenceEnabled: iridescence.enabled ?? d.iridescenceEnabled,
        iridescenceIntensity: iridescence.intensity ?? d.iridescenceIntensity,
        iridescenceSpeed: iridescence.speed ?? d.iridescenceSpeed,

        prismEdgeEnabled: prismEdge.enabled ?? d.prismEdgeEnabled,
        prismEdgeIntensity: prismEdge.intensity ?? d.prismEdgeIntensity,
        prismEdgeThinness: prismEdge.thinness ?? d.prismEdgeThinness,
        prismEdgeSpread: prismEdge.spread ?? d.prismEdgeSpread,
        prismEdgeSpeed: prismEdge.speed ?? d.prismEdgeSpeed,
        prismEdgeRipple: prismEdge.ripple ?? d.prismEdgeRipple,

        bloomIntensity: bloom.intensity ?? d.bloomIntensity,
        bloomThreshold: bloom.threshold ?? d.bloomThreshold,
        chromaticAberration: bloom.chromaticAberration ?? d.chromaticAberration,

        shapeType: shape.type ?? d.shapeType,
        shapeRotationX: shape.rotationX ?? d.shapeRotationX,
        shapeRotationY: shape.rotationY ?? d.shapeRotationY,
        shapeRotationZ: shape.rotationZ ?? d.shapeRotationZ,
        shapeAutoRotateSpeedX: shape.autoRotateSpeedX ?? d.shapeAutoRotateSpeedX,
        shapeAutoRotateSpeedY: shape.autoRotateSpeedY ?? d.shapeAutoRotateSpeedY,
        sphereRadius: shape.sphereRadius ?? d.sphereRadius,
        torusRadius: shape.torusRadius ?? d.torusRadius,
        torusTube: shape.torusTube ?? d.torusTube,
        cylinderRadius: shape.cylinderRadius ?? d.cylinderRadius,
        cylinderHeight: shape.cylinderHeight ?? d.cylinderHeight,
        planeBend: shape.planeBend ?? d.planeBend,
        planeTwist: shape.planeTwist ?? d.planeTwist,
        silhouetteFade: shape.silhouetteFade ?? d.silhouetteFade,
        cylinderFade: shape.cylinderFade ?? d.cylinderFade,
        ribbonFade: shape.ribbonFade ?? d.ribbonFade,

        cameraLock: camera.lock ?? d.cameraLock,
        cameraX: camera.x ?? d.cameraX,
        cameraY: camera.y ?? d.cameraY,
        cameraZ: camera.z ?? d.cameraZ,
        cameraRotationX: camera.rotationX ?? d.cameraRotationX,
        cameraRotationY: camera.rotationY ?? d.cameraRotationY,
        cameraRotationZ: camera.rotationZ ?? d.cameraRotationZ,
        cameraZoom: camera.zoom ?? d.cameraZoom,

        resolution: advanced.resolution ?? d.resolution,
        renderScale: advanced.renderScale ?? d.renderScale,
        antialias: advanced.antialias ?? d.antialias,
        licenseKey: advanced.licenseKey || undefined,
    }
}

export default function BlueMotionBackground2(props: any) {
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

// Six fixed slots instead of an Array control. NeatGradient caps out at 6
// colors anyway, and — unlike an Array, whose items all share one control
// schema — each of these carries its own defaultValue, so "reset to
// default" on any single slot restores that slot's own original color
// instead of every slot collapsing onto one shared default.
function colorSlotControl(title: string, defaultColor: string, defaultEnabled: boolean) {
    return {
        type: ControlType.Object,
        title,
        controls: {
            color: { type: ControlType.Color, defaultValue: defaultColor },
            enabled: { type: ControlType.Boolean, defaultValue: defaultEnabled },
            influence: {
                type: ControlType.Number,
                defaultValue: 1,
                min: 0,
                max: 2,
                step: 0.05,
            },
        },
    }
}

addPropertyControls(BlueMotionBackground2, {
    color1: colorSlotControl("Color 1", "#002C44", true),
    color2: colorSlotControl("Color 2", "#015C83", true),
    color3: colorSlotControl("Color 3", "#11232D", true),
    color4: colorSlotControl("Color 4", "#ff5a5f", false),
    color5: colorSlotControl("Color 5", "#c81d25", false),
    color6: colorSlotControl("Color 6", "#A8E6CF", false),

    movement: {
        type: ControlType.Object,
        title: "Waves",
        controls: {
            speed: { type: ControlType.Number, defaultValue: 5.5, min: 0, max: 20, step: 0.1 },
            horizontalPressure: { type: ControlType.Number, defaultValue: 4, min: 0, max: 10, step: 0.1 },
            verticalPressure: { type: ControlType.Number, defaultValue: 3, min: 0, max: 10, step: 0.1 },
            waveFrequencyX: { type: ControlType.Number, defaultValue: 0, min: 0, max: 25, step: 0.1 },
            waveFrequencyY: { type: ControlType.Number, defaultValue: 0, min: 0, max: 25, step: 0.1 },
            waveAmplitude: { type: ControlType.Number, defaultValue: 0, min: 0, max: 20, step: 0.1 },
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
            shadows: { type: ControlType.Number, defaultValue: 2, min: 0, max: 10, step: 0.1 },
            highlights: { type: ControlType.Number, defaultValue: 7, min: 0, max: 10, step: 0.1 },
            colorBrightness: { type: ControlType.Number, defaultValue: 1, min: 0, max: 2, step: 0.05 },
            colorSaturation: { type: ControlType.Number, defaultValue: 8, min: 0, max: 10, step: 0.1 },
            colorBlending: { type: ControlType.Number, defaultValue: 5, min: 0, max: 10, step: 0.1 },
            wireframe: { type: ControlType.Boolean, defaultValue: false },
            flatShading: { type: ControlType.Boolean, defaultValue: true },
        },
    },

    background: {
        type: ControlType.Object,
        title: "Background",
        controls: {
            color: { type: ControlType.Color, defaultValue: "#FF0000" },
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
            speed: { type: ControlType.Number, defaultValue: 0, min: 0, max: 5, step: 0.05 },
        },
    },

    flow: {
        type: ControlType.Object,
        title: "Flow",
        controls: {
            enabled: { type: ControlType.Boolean, defaultValue: false },
            distortionA: { type: ControlType.Number, defaultValue: 5, min: 0, max: 10, step: 0.1 },
            distortionB: { type: ControlType.Number, defaultValue: 7.7, min: 0, max: 10, step: 0.1 },
            scale: { type: ControlType.Number, defaultValue: 2.6, min: 0, max: 10, step: 0.1 },
            ease: { type: ControlType.Number, defaultValue: 0.36, min: 0, max: 1, step: 0.01 },
        },
    },

    scrollOffset: {
        type: ControlType.Object,
        title: "Y Offset",
        controls: {
            yOffset: { type: ControlType.Number, defaultValue: 0, min: -2000, max: 2000, step: 1 },
            waveMultiplier: { type: ControlType.Number, defaultValue: 1.9, min: 0, max: 20, step: 0.1 },
            colorMultiplier: { type: ControlType.Number, defaultValue: 1.8, min: 0, max: 20, step: 0.1 },
            flowMultiplier: { type: ControlType.Number, defaultValue: 2.2, min: 0, max: 20, step: 0.1 },
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
            voidLikelihood: { type: ControlType.Number, defaultValue: 0.22, min: 0, max: 1, step: 0.01 },
            voidWidthMin: { type: ControlType.Number, defaultValue: 120, min: 0, max: 2000, step: 1 },
            voidWidthMax: { type: ControlType.Number, defaultValue: 150, min: 0, max: 2000, step: 1 },
            bandDensity: { type: ControlType.Number, defaultValue: 1.9, min: 0, max: 10, step: 0.05 },
            colorBlending: { type: ControlType.Number, defaultValue: 0.12, min: 0, max: 1, step: 0.01 },
            seed: { type: ControlType.Number, defaultValue: 333, min: 0, max: 10000, step: 1 },
            ease: { type: ControlType.Number, defaultValue: 0.75, min: 0, max: 1, step: 0.01 },
            backgroundColor: { type: ControlType.Color, defaultValue: "#D0DBFB" },
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
            resolution: { type: ControlType.Number, defaultValue: 0.5, min: 0.1, max: 2, step: 0.05 },
            renderScale: { type: ControlType.Number, defaultValue: 1, min: 0.1, max: 3, step: 0.05 },
            antialias: { type: ControlType.Boolean, defaultValue: false },
            licenseKey: { type: ControlType.String, defaultValue: "", placeholder: "NEAT-..." },
        },
    },
})
