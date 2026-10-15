import * as React from "react"
import ATMNeedWantCart from "../../../ATMNeedWantCart"
function App() {
    const [still, setStill] = React.useState(false)
    const [secs, setSecs] = React.useState(4.8)
    React.useEffect(() => { (window as any).__reduce = still }, [still])
    return (
        <>
            <div className="controls">
                <label>Loop <input id="loop" type="range" min={2} max={10} step={0.1} value={secs} onChange={(e) => setSecs(Number(e.target.value))} /> <output>{secs.toFixed(1)} s</output></label>
                <label><input id="still" type="checkbox" checked={still} onChange={(e) => setStill(e.target.checked)} /> Reduce motion (still frame)</label>
            </div>
            <div className="card">
                <div className="kicker">LESSON 1</div>
                <h1>Need or Want?</h1>
                <span className="btn">Get Started →</span>
                <div className="loop" key={String(still)}><ATMNeedWantCart loopSeconds={secs} /></div>
            </div>
        </>
    )
}
;(window as any).ReactDOM.createRoot(document.getElementById("app")).render(<App />)
