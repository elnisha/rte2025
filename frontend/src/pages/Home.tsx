import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Mail } from "lucide-react"


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="flex justify-between items-center px-12 py-6">
        <div className="text-2x1 font-bold">
          <span className="text-red-500">Fire</span>
          <span className="text-orange-500">From</span>
        </div>

        <nav className="flex gap-10 text-gray-800 font-medium">
          <Link to="/reports" className="hover:text-orange-500 transition">
            Reports
          </Link>
          <Link to="/analytics" className="hover:text-orange-500 transition">
            Analytics
          </Link>
          <Link to="/transcription" className="hover:text-orange-500 transition">
            Transcription
          </Link>
          <Link to="/templates" className="hover:text-orange-500 transition">
            Form Templates
          </Link>
        </nav>

        <Link to="/dashboard">
          <Button className="bg-gradient-to-r from-red-500 to-orange-500 text-white hover:opacity-90">
            <Mail className="mr-2 h-4 w-4" />
            Login with Email
          </Button>
        </Link>
      </header>

      <main className="flex flex-col items-center justify-center text-center flex-1 px-4">
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight max-w-3xl mb-4">
          Less paperwork. More action. <br /> With{" "}
          <span className="text-orange-500">FireForm</span>
        </h1>

        <p className="text-gray-500 max-w-2xl mb-10">
          Firefighters spend countless hours filling out reports and completing paperwork after every operation. It's a necessary part of the job — but it's slow, repetitive, and spread across multiple systems.
          <br/>
          The result?
        </p>

        <Link to="/dashboard">
          <Button className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-5 text-lg hover:opacity-90">
            <Mail className="mr-2 h-4 w-4"/>
            Login with Email
          </Button>
        </Link>
      </main>
    </div>
  )
}
