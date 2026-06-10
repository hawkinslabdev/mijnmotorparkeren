import React, { useState, useEffect } from 'react'
import { Search, Menu, X, MapPin, ExternalLink, Github, Coffee } from 'lucide-react'

interface HeaderProps {
  onSearchOpen: () => void
  onMenuToggle?: () => void
  selectedGemeente?: string | null
}

export const Header: React.FC<HeaderProps> = ({ onSearchOpen, onMenuToggle, selectedGemeente }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
    onMenuToggle?.()
  }

  const closeMenu = () => setIsMenuOpen(false)

  useEffect(() => {
    if (!isMenuOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMenuOpen])

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-2">
            <a
              href="/"
              aria-label="Ga naar de hoofdpagina"
              className="focus:outline-none focus:ring-2 focus:ring-blue-400 rounded flex-shrink-0"
            >
              <img
                src="/logo.svg"
                alt=""
                className="h-8 sm:h-10 aspect-square object-contain"
                aria-hidden="true"
              />
            </a>
            <div>
              <span className="block text-lg sm:text-xl font-semibold text-gray-900 leading-tight">
                MijnMotorParkeren.nl
              </span>
              <p className="text-xs text-gray-500">Even snel je motor parkeren</p>
            </div>
          </div>

          {/* Current Location Display */}
          {selectedGemeente && (
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" aria-hidden="true" />
              <span>Geselecteerd: {selectedGemeente}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button */}
            <button
              onClick={onSearchOpen}
              aria-label="Locatie zoeken"
              className="flex items-center px-3 h-11 sm:h-9 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-150 ease-out hover:shadow-sm active:scale-[0.97] active:shadow-none motion-reduce:transition-none motion-reduce:hover:shadow-none motion-reduce:active:scale-100"
            >
              <Search className="w-4 h-4 text-gray-600" aria-hidden="true" />
              <span className="hidden sm:inline text-sm text-gray-600 ml-2">Locatie zoeken...</span>
              <kbd className="hidden lg:inline-flex items-center px-2 py-1 bg-white border border-gray-300 rounded text-xs font-sans text-gray-400 ml-2">
                ⌘K
              </kbd>
            </button>

            {/* Report issue — Desktop Only */}
            <div className="hidden md:block">
              <a
                href="https://github.com/hawkinslabdev/mijnmotorparkeren/issues/new/choose"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Meld een fout op de kaart (opent GitHub)"
                className="flex items-center space-x-2 px-3 h-9 bg-[#dbede3] hover:bg-[#c2e2d1] rounded-lg transition-all duration-150 ease-out hover:shadow-sm active:scale-[0.97] active:shadow-none text-green-800 hover:text-green-900 motion-reduce:transition-none motion-reduce:hover:shadow-none motion-reduce:active:scale-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"
                  />
                </svg>
                <span className="hidden lg:inline text-sm">Meld probleem</span>
              </a>
            </div>

            {/* GitHub & Coffee — Desktop Only */}
            <div className="hidden md:flex items-center space-x-2">
              <a
                href="https://github.com/hawkinslabdev/mijnmotorparkeren"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Bekijken op GitHub"
                className="group flex items-center px-3 h-9 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all duration-150 ease-out hover:shadow-sm active:scale-[0.97] active:shadow-none text-gray-600 hover:text-gray-900 motion-reduce:transition-none motion-reduce:hover:shadow-none motion-reduce:active:scale-100"
              >
                <Github className="w-4 h-4 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transition-none" aria-hidden="true" />
              </a>
              <a
                href="https://buymeacoffee.com/hawkinslabdev"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Steun mij met een koffie"
                className="group flex items-center px-3 h-9 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-all duration-150 ease-out hover:shadow-sm active:scale-[0.97] active:shadow-none text-yellow-800 hover:text-yellow-900 motion-reduce:transition-none motion-reduce:hover:shadow-none motion-reduce:active:scale-100"
              >
                <Coffee className="w-4 h-4 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transition-none" aria-hidden="true" />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={handleMenuToggle}
              aria-label={isMenuOpen ? 'Sluit menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-all duration-150 ease-out active:scale-[0.88] active:bg-gray-100 motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" aria-hidden="true" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <>
            <button
              className="fixed inset-0 z-40 w-full cursor-default"
              onClick={closeMenu}
              aria-label="Sluit menu"
              tabIndex={-1}
            />
            <div id="mobile-menu" className="md:hidden py-4 border-t border-gray-200 z-50 relative">
              <div className="space-y-3">
                {selectedGemeente && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" aria-hidden="true" />
                    <span>Geselecteerd: {selectedGemeente}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <a
                    href="https://github.com/hawkinslabdev/mijnmotorparkeren/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg items-center justify-between"
                  >
                    <span>Meld probleem</span>
                    <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0" aria-hidden="true" />
                  </a>
                  <a
                    href="https://github.com/hawkinslabdev/mijnmotorparkeren"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex px-3 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-lg items-center justify-between"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0" aria-hidden="true" />
                  </a>
                  <a
                    href="https://buymeacoffee.com/hawkinslabdev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex px-3 py-3 text-sm text-gray-700 hover:bg-yellow-100 rounded-lg items-center justify-between"
                  >
                    <span>Trakteer mij op een koffie ☕</span>
                    <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export default Header
