import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Carte from "./pages/Carte";
import Quete from "./pages/Quete";
import Podium from "./pages/Podium";
import Defis from "./pages/Defis";
import Credits from "./pages/Credits";
import Accessibilite from "./pages/Accessibilite";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Carte />} />
          <Route path="quete/:id" element={<Quete />} />
          <Route path="podium" element={<Podium />} />
          <Route path="defis" element={<Defis />} />
          <Route path="credits" element={<Credits />} />
          <Route path="accessibilite" element={<Accessibilite />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
