// Self-check for SimulatorStore. Run (Node 24 strips the types):
//   S=<scratch dir>; cp credit-score/SimulatorStore.tsx $S/SimulatorStore.ts
//   cp credit-score/SimulatorStore.check.ts $S/ && node $S/SimulatorStore.check.ts
import assert from "node:assert/strict"
import {
    _clearForTests,
    anyOn,
    newEntryKey,
    onReset,
    remove,
    resetAll,
    setPoints,
    simulatedScore,
    subscribe,
    totalPoints,
} from "./SimulatorStore.ts"

function sums() {
    _clearForTests()
    setPoints(newEntryKey("a"), -18)
    setPoints(newEntryKey("b"), 15)
    setPoints(newEntryKey("c"), null)
    assert.equal(totalPoints(), -3)
    assert.equal(anyOn(), true)
}

function zeroCountsAsOn() {
    _clearForTests()
    setPoints(newEntryKey("a"), 0)
    assert.equal(anyOn(), true)
    assert.equal(simulatedScore(742, 300, 850), 742)
}

function clamps() {
    _clearForTests()
    const k = newEntryKey("a")
    setPoints(k, -600)
    assert.equal(simulatedScore(742, 300, 850), 300)
    setPoints(k, 300)
    assert.equal(simulatedScore(742, 300, 850), 850)
}

function duplicateIds() {
    _clearForTests()
    const k1 = newEntryKey("loan")
    const k2 = newEntryKey("loan")
    assert.notEqual(k1, k2)
    setPoints(k1, -18)
    setPoints(k2, -14)
    assert.equal(totalPoints(), -32)
}

function removes() {
    _clearForTests()
    const k = newEntryKey("a")
    setPoints(k, -22)
    remove(k)
    assert.equal(totalPoints(), 0)
    assert.equal(anyOn(), false)
}

function resets() {
    _clearForTests()
    const kOn = newEntryKey("raiseLimit")
    const kOff = newEntryKey("missed")
    setPoints(kOff, -95)
    onReset(() => setPoints(kOn, 8))
    onReset(() => setPoints(kOff, null))
    let fired = 0
    subscribe(() => {
        fired++
    })
    resetAll()
    assert.equal(totalPoints(), 8)
    assert.ok(fired >= 1)
}

sums()
zeroCountsAsOn()
clamps()
duplicateIds()
removes()
resets()
console.log("SimulatorStore: all checks passed")
