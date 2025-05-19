import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest'
import World from '../World.js'
import * as THREE from 'three'
import Sound from '../Sound.js'
import AmbientSound from '../AmbientSound.js'

// Mock dependencies
vi.mock('../Sound.js')
vi.mock('../AmbientSound.js')
vi.mock('../Environment.js')
vi.mock('../Fox.js')
vi.mock('../Robot.js')
vi.mock('../Floor.js')
vi.mock('../ThirdPersonCamera.js')
vi.mock('../../loaders/ToyCarLoader.js', () => ({
    default: class ToyCarLoader {
        constructor() {}
        async loadFromAPI() {
            return Promise.resolve()
        }
    }
}))
vi.mock('../../controls/MobileControls.js')

describe('World', () => {
    let world
    let mockExperience

    beforeAll(() => {
        // Enable fake timers for all tests
        vi.useFakeTimers()
    })

    afterAll(() => {
        // Restore timers after all tests
        vi.useRealTimers()
    })

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()
        
        // Create mock experience object
        mockExperience = {
            scene: new THREE.Scene(),
            resources: {
                on: vi.fn((event, callback) => {
                    if (event === 'ready') {
                        // Store callback for later use
                        mockExperience.resources.readyCallback = callback
                    }
                }),
                items: {}
            },
            renderer: {
                instance: {
                    xr: {
                        isPresenting: false
                    }
                }
            },
            keyboard: {
                keys: {
                    up: false,
                    down: false,
                    left: false,
                    right: false
                }
            },
            tracker: {
                showCancelButton: vi.fn(),
                finished: false,
                stop: vi.fn(),
                saveTime: vi.fn(),
                showEndGameModal: vi.fn()
            },
            vr: {
                bindCharacter: vi.fn()
            },
            raycaster: {
                removeRandomObstacles: vi.fn(),
                removeAllObstacles: vi.fn()
            },
            menu: {
                setStatus: vi.fn()
            },
            isThirdPerson: true,
            obstacleWavesDisabled: false,
            obstacleWaveTimeout: null
        }

        // Create world instance
        world = new World(mockExperience)
    })

    describe('constructor', () => {
        it('should initialize with correct properties', () => {
            expect(world.experience).toBe(mockExperience)
            expect(world.scene).toBe(mockExperience.scene)
            expect(world.resources).toBe(mockExperience.resources)
            expect(world.allowPrizePickup).toBe(false)
            expect(world.hasMoved).toBe(false)
        })

        it('should create sound instances', () => {
            expect(Sound).toHaveBeenCalledWith('/sounds/coin.ogg')
            expect(AmbientSound).toHaveBeenCalledWith('/sounds/ambiente.mp3')
            expect(Sound).toHaveBeenCalledWith('/sounds/winner.mp3')
        })

        it('should enable prize pickup after 2 seconds', () => {
            expect(world.allowPrizePickup).toBe(false)
            vi.advanceTimersByTime(2000)
            expect(world.allowPrizePickup).toBe(true)
        })
    })

    describe('resource loading', () => {
        it('should initialize components when resources are ready', async () => {
            // Create mock components
            world.floor = { constructor: vi.fn() }
            world.environment = { constructor: vi.fn() }
            world.fox = { update: vi.fn() }
            world.robot = { update: vi.fn() }
            world.thirdPersonCamera = { update: vi.fn() }

            // Simulate resources ready event
            await mockExperience.resources.readyCallback()

            expect(mockExperience.tracker.showCancelButton).toHaveBeenCalled()
            expect(mockExperience.vr.bindCharacter).toHaveBeenCalled()
        })
    })

    describe('audio controls', () => {
        it('should toggle ambient sound', () => {
            const mockToggle = vi.fn()
            world.ambientSound = { toggle: mockToggle }
            
            world.toggleAudio()
            expect(mockToggle).toHaveBeenCalled()
        })
    })

    describe('prize collection', () => {
        let prizeMock

        beforeEach(() => {
            // Setup required properties for prize collection
            world.allowPrizePickup = true
            prizeMock = {
                collected: false,
                pivot: { position: new THREE.Vector3(0, 0, 0) },
                collect: vi.fn(() => {
                    prizeMock.collected = true
                }),
                update: vi.fn()
            }
            world.loader = {
                prizes: [prizeMock]
            }
            world.robot = {
                body: {
                    position: new THREE.Vector3(0, 0, 0),
                    velocity: new THREE.Vector3(1, 0, 0)
                },
                points: 0,
                update: vi.fn()
            }
            world.fox = { update: vi.fn() }
        })

        it('should not collect prizes if pickup is not allowed', () => {
            world.allowPrizePickup = false
            world.update(0)
            expect(prizeMock.collect).not.toHaveBeenCalled()
        })

        it('should collect prize when robot is close enough and moving', () => {
            // Mock the splice method to prevent actual array modification
            const originalSplice = Array.prototype.splice
            Array.prototype.splice = vi.fn()
            
            world.update(0)
            
            expect(prizeMock.collect).toHaveBeenCalled()
            expect(world.points).toBe(1)
            expect(world.robot.points).toBe(1)
            
            // Restore original splice method
            Array.prototype.splice = originalSplice
        })

        it('should trigger win condition when reaching 14 points', () => {
            // Mock the splice method to prevent actual array modification
            const originalSplice = Array.prototype.splice
            Array.prototype.splice = vi.fn()
            
            world.points = 13
            world.robot.body.position.set(0, 0, 0)
            prizeMock.pivot.position.set(0, 0, 0)
            
            world.update(0)
            
            expect(mockExperience.tracker.stop).toHaveBeenCalled()
            expect(mockExperience.tracker.saveTime).toHaveBeenCalled()
            expect(mockExperience.tracker.showEndGameModal).toHaveBeenCalled()
            expect(mockExperience.obstacleWavesDisabled).toBe(true)
            expect(mockExperience.raycaster.removeAllObstacles).toHaveBeenCalled()
            
            // Restore original splice method
            Array.prototype.splice = originalSplice
        })
    })

    describe('update method', () => {
        beforeEach(() => {
            world.fox = { update: vi.fn() }
            world.robot = { update: vi.fn() }
            world.thirdPersonCamera = { update: vi.fn() }
        })

        it('should update fox and robot', () => {
            world.update(0)
            expect(world.fox.update).toHaveBeenCalled()
            expect(world.robot.update).toHaveBeenCalled()
        })

        it('should update third person camera when in third person mode', () => {
            world.update(0)
            expect(world.thirdPersonCamera.update).toHaveBeenCalled()
        })

        it('should not update third person camera in VR mode', () => {
            mockExperience.renderer.instance.xr.isPresenting = true
            world.update(0)
            expect(world.thirdPersonCamera.update).not.toHaveBeenCalled()
        })
    })
}) 