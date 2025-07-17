// src/components/Layout/Header.tsx

import React, { useState, useEffect, useRef } from 'react'
import { Search, Menu, X, MapPin, ExternalLink, Github, Coffee } from 'lucide-react'

interface HeaderProps {
  onSearchOpen: () => void
  onMenuToggle?: () => void
  selectedGemeente?: string | null
}

export const Header: React.FC<HeaderProps> = ({ 
  onSearchOpen, 
  onMenuToggle,
  selectedGemeente 
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false)
  const githubModalRef = useRef<HTMLDivElement | null>(null)


  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen)
    onMenuToggle?.()
  }

  // Auto-close after 5 seconds
  useEffect(() => {
    if (!isGithubModalOpen) return;
    const timer = setTimeout(() => setIsGithubModalOpen(false), 5000);
    return () => clearTimeout(timer);
  }, [isGithubModalOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isGithubModalOpen) return;
    function handleClick(event: MouseEvent) {
      if (githubModalRef.current && !githubModalRef.current.contains(event.target as Node)) {
        setIsGithubModalOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isGithubModalOpen]);

  // Mobile toast (centered)

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <a href="/" className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400" title="Ga naar de hoofdpagina">
                <MapPin className="w-5 h-5 text-white" />
              </a>
              {/* Show title on all screen sizes */}
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900">MijnMotorParkeren.nl</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Even snel je motor parkeren</p>
              </div>
            </div>
          </div>

          {/* Current Location Display */}
          {selectedGemeente && (
            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>Viewing: {selectedGemeente}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* Search Button */}
            <button
              onClick={onSearchOpen}
              className="flex items-center px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Search className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline text-sm text-gray-600 ml-2">
                Locatie zoeken...
              </span>
              <kbd className="hidden lg:inline-flex items-center px-2 py-1 bg-white border border-gray-300 rounded text-xs font-sans text-gray-400 ml-2">
                ⌘K
              </kbd>
            </button>

            {/* Meld map issue button; Desktop Only */}
            <div className="hidden md:block">
              <a
                href="https://melden.mijnmotorparkeren.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-3 py-2 bg-[#dbede3] hover:bg-[#c2e2d1] rounded-lg transition-colors text-green-800 hover:text-green-900"
                title="Meld een fout op de kaart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" /></svg>
                <span className="hidden lg:inline text-sm">Meld kaartprobleem</span>
              </a>
            </div>

            {/* GitHub & Coffee Buttons; Desktop Only */}
            <div className="hidden md:flex items-center space-x-2">
              <a
                href="https://github.com/hawkinslabdev/mijnmotorparkeren"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
                title="View on GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://buymeacoffee.com/hawkinslabdev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-3 py-2 bg-yellow-100 hover:bg-yellow-200 rounded-lg transition-colors text-yellow-800 hover:text-yellow-900"
                title="Steun met een koffie!"
              >
                <Coffee className="w-4 h-4" />
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={handleMenuToggle}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-gray-600" />
              ) : (
                <Menu className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <>
            {/* Overlay to close menu when clicking outside */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsMenuOpen(false)}
              aria-label="Sluit menu"
            />
            <div className="md:hidden py-4 border-t border-gray-200 z-50 relative">
              <div className="space-y-3">
                {selectedGemeente && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>Viewing: {selectedGemeente}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <a 
                    href="https://melden.mijnmotorparkeren.nl" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg items-center justify-between"
                  >
                    <span>Melden kaartprobleem</span>
                    <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0" />
                  </a>
                  <a
                    href="https://github.com/hawkinslabdev/mijnmotorparkeren"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg items-center justify-between"
                  >
                    <span>GitHub</span>
                    <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0" />
                  </a>
                  <a
                    href="https://buymeacoffee.com/hawkinslabdev"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-yellow-100 rounded-lg items-center justify-between"
                  >
                    <span>Trakteer mij op een koffie ☕</span>
                    <ExternalLink className="w-4 h-4 ml-2 flex-shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
        {/* ErrorModal and ErrorModalMobile are kept for future use */}
        {/* {isGithubModalOpen && <><ErrorModal /><ErrorModalMobile /></>} */}
      </div>
    </header>
  )
}

export default Header