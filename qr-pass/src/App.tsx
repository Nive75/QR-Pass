import { BrowserRouter, Route, Routes } from "react-router-dom";
import BeaconQR from "./components/BeaconQR";
import ScanQR from "./components/ScanQR";
import Home from "./pages/Home";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/beacon" element={<BeaconQR />} />
        <Route path="/scan" element={<ScanQR />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;