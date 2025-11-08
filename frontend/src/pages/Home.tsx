import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-5xl font-bold mb-6">FireForm</h1>
      <p className="text-lg text-gray-700 mb-8">
        Automate fire department reports with AI. Quick, clean, and unified.
      </p>
      <Link to="/dashboard">
        <button>Get Started</button>
      </Link>
    </main>
  );
}
