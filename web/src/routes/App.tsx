import { Outlet } from "react-router-dom";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-1">
        <div className="mx-auto max-w-[1000px]" style={{ padding: '24px 16px' }}>
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  );
}
