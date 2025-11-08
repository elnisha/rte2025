import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useLocation, Link } from "react-router-dom"
import { Home, FileText, Settings, BarChart2, LogOut } from "lucide-react"

export default function Sidebar() {
  const location = useLocation()

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: Home },
    { to: "/dashboard/reports", label: "Reports", icon: FileText },
    { to: "/dashboard/form-templates", label: "Form Templates", icon: Settings },
    { to: "/dashboard/analytics", label: "Analytics", icon: BarChart2 },
  ]

  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 p-6">
      {/* Header */}
    <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
        FireForm
    </h2>
      <Separator className="mb-6" />

      {/* Navigation */}
      <nav className="flex flex-col space-y-2">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Button
              variant={location.pathname === to ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-2 text-gray-700",
                location.pathname === to && "bg-gray-100 text-gray-900 font-medium"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          </Link>
        ))}
      </nav>

        
      {/* Footer */}
      <div className="mt-auto pt-6">
        <Link to="/">
          <Button variant="destructive" className="w-full gap-2">
            <LogOut className="h-4 w-4" />
            Exit
          </Button>
        </Link>
      </div>
    </div>
  )
}
