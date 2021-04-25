import './style.scss'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader, GLTFParser } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { gsap } from 'gsap'

const state = { variant: 'midnight'}

/**
 * Loaders
 */
let sceneReady = false;
const loadingBarElement: Element & {style: {[key: string]: string}} | null = document.querySelector('.loading-bar')
const loadingManager = new THREE.LoadingManager(
    // Loaded
    () =>
    {
        // Wait a little
        window.setTimeout(() =>
        {
            if (!loadingBarElement) return;
            // Animate overlay
            gsap.to(overlayMaterial.uniforms.uAlpha, { duration: 3, value: 0, delay: 1 })

            // Update loadingBarElement
            loadingBarElement.classList.add('ended')
            loadingBarElement.style.transform = ''
        }, 500)
        window.setTimeout(() => {
            sceneReady = true;
        }, 3000)
    },

    // Progress
    (_itemUrl, itemsLoaded, itemsTotal) =>
    {
        if (!loadingBarElement) return;
        // Calculate the progress and update the loadingBarElement
        const progressRatio = itemsLoaded / itemsTotal
        loadingBarElement.style.transform = `scaleX(${progressRatio})`
    }
)
const gltfLoader = new GLTFLoader(loadingManager)
const cubeTextureLoader = new THREE.CubeTextureLoader(loadingManager)

/**
 * Base
 */
// Debug
const debugObject: {envMapIntensity?: number} = {}

// Canvas
const canvas = document.querySelector('canvas.webgl') as HTMLElement

// Scene
const scene = new THREE.Scene()

/**
 * Overlay
 */
const overlayGeometry = new THREE.PlaneGeometry(2, 2, 1, 1)
const overlayMaterial = new THREE.ShaderMaterial({
    // wireframe: true,
    transparent: true,
    uniforms:
    {
        uAlpha: { value: 1 }
    },
    vertexShader: `
        void main()
        {
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uAlpha;

        void main()
        {
            gl_FragColor = vec4(0.0, 0.0, 0.0, uAlpha);
        }
    `
})
const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
scene.add(overlay)

/**
 * Update all materials
 */
const updateAllMaterials = (parser: GLTFParser, extension, variantName) =>
{

    const variantIndex = extension.variants.findIndex(v => v.name.includes(variantName))

    scene.traverse(async (child) =>
    {
        if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial && child.userData.gltfExtensions['KHR_materials_variants'])
        {
            const meshVariants = child.userData.gltfExtensions['KHR_materials_variants'];
            if (!meshVariants) return;
            if (!child.userData.originalMaterial) child.userData.originalMaterial = child.material
            const mappings = meshVariants.mappings.find(mapping => mapping.variants.includes(variantIndex))
            if (mappings) {
                child.material = await parser.getDependency('material', mappings.material);
                parser.assignFinalMaterial(child)
            } else {
                child.material = child.userData.originalMaterial
            }

            child.material.envMap = environmentMap
            child.material.envMapIntensity = debugObject.envMapIntensity || child.material.envMapIntensity
            child.material.needsUpdate = true
            child.castShadow = true
            child.receiveShadow = true
        }
    })
}

/**
 * Environment map
 */
const environmentMap = cubeTextureLoader.load([
    // '/textures/environmentMaps/0/px.jpg',
    // '/textures/environmentMaps/0/nx.jpg',
    // '/textures/environmentMaps/0/py.jpg',
    // '/textures/environmentMaps/0/ny.jpg',
    // '/textures/environmentMaps/0/pz.jpg',
    // '/textures/environmentMaps/0/nz.jpg'
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])

environmentMap.encoding = THREE.sRGBEncoding

scene.background = environmentMap
scene.environment = environmentMap

debugObject.envMapIntensity = 5

/**
 * Models
 */
gltfLoader.load(
    '/models/MaterialsVariantsShoe/glTF/MaterialsVariantsShoe.gltf',
    (gltf) =>
    {
        gltf.scene.scale.set(20, 20, 20)
        gltf.scene.rotation.y = Math.PI * 0.5
        gltf.scene.rotation.z = -Math.PI * 0.1
        gltf.scene.position.y += -1
        scene.add(gltf.scene)


        const parser = gltf.parser;
        const variantsExtension = gltf.userData.gltfExtensions['KHR_materials_variants']

        const buttons = document.querySelectorAll('.choice')
        buttons.forEach(button => {
            button.addEventListener('mousedown', () => {
                updateAllMaterials(parser, variantsExtension, button.classList[1])
            })
        })

        updateAllMaterials(parser, variantsExtension, state.variant)
    }
)

const raycaster = new THREE.Raycaster();
const points: {position: THREE.Vector3; element: Element & {style: {[key: string]: string}} | null}[] = [
    {
        position: new THREE.Vector3(0, -0.3, -2),
        element: document.querySelector('.point-0')
    },
    {
        position: new THREE.Vector3(0.3, 0.8, - 0.9),
        element: document.querySelector('.point-1')
    },
    {
        position: new THREE.Vector3(-0.6, - 1.3, - 0.7),
        element: document.querySelector('.point-2')
    },
    {
        position: new THREE.Vector3(0, 0.3, 0.7),
        element: document.querySelector('.point-3')
    },
    {
        position: new THREE.Vector3(0, 2, 1.7),
        element: document.querySelector('.point-4')
    },
]

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight('#ffffff', 3)
directionalLight.castShadow = true
directionalLight.shadow.camera.far = 15
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.normalBias = 0.05
directionalLight.position.set(0.25, 3, - 2.25)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(4, 1, - 4)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas as HTMLCanvasElement,
    antialias: true
})
renderer.physicallyCorrectLights = true
renderer.outputEncoding = THREE.sRGBEncoding
renderer.toneMapping = THREE.ReinhardToneMapping
renderer.toneMappingExposure = 3
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const tick = () =>
{
    // Update controls
    controls.update()

    if (sceneReady) {
        for(const point of points) {
            if (!point.element) continue;
            const screenPosition = point.position.clone()
            screenPosition.project(camera)
            
            raycaster.setFromCamera(screenPosition, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            
            if (intersects.length === 0) {
                point.element.classList.add('visible');
            } else {
                const intersectionDistance = intersects[0].distance
                const pointDistance = point.position.distanceTo(camera.position);
                if (pointDistance > intersectionDistance) {
                    point.element.classList.remove('visible')
                } else {
                    point.element.classList.add('visible');
                }
            }
            
            const translateX = screenPosition.x * sizes.width * 0.5;
            const translateY = screenPosition.y * sizes.height * 0.5;
            point.element.style.transform = `translate(${translateX}px, ${-translateY}px)`
            
        }
    }

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()