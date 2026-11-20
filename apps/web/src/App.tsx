import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Demo from "./pages/Demo";
import Assistant from "./pages/Assistant";
import Defis from "./pages/Defis";
import Credits from "./pages/Credits";
import Accessibilite from "./pages/Accessibilite";
import Inscription from "./pages/Inscription";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="demo" element={<Demo />} />
          <Route path="assistant" element={<Assistant />} />
          <Route path="defis" element={<Defis />} />
          <Route path="credits" element={<Credits />} />
          <Route path="accessibilite" element={<Accessibilite />} />
          <Route path="inscription" element={<Inscription />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
