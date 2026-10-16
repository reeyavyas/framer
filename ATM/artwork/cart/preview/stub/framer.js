export const addPropertyControls = () => {}; export const ControlType = new Proxy({}, { get: (_, k) => String(k) });
