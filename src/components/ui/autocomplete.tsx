'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

type AutocompleteOption = {
  value: string
  label: string
}

type AutocompleteProps = {
  options: AutocompleteOption[]
  defaultValue?: string
  name: string
  placeholder?: string
  required?: boolean
}

export default function Autocomplete({
  options,
  defaultValue = '',
  name,
  placeholder = 'Rechercher...',
  required = false
}: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedValue, setSelectedValue] = useState(defaultValue)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Find label of default value
  useEffect(() => {
    const selected = options.find(opt => opt.value === defaultValue)
    if (selected) {
      setSearch(selected.label)
    } else {
      setSearch('')
    }
    setSelectedValue(defaultValue)
  }, [defaultValue, options])

  // Handle clicking outside to close the list
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // Reset search term to the label of the selected value if not empty
        const selected = options.find(opt => opt.value === selectedValue)
        if (selected) {
          setSearch(selected.label)
        } else {
          setSearch('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedValue, options])

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (option: AutocompleteOption) => {
    setSelectedValue(option.value)
    setSearch(option.label)
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelectedValue('')
    setSearch('')
    setIsOpen(false)
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input type="hidden" name={name} value={selectedValue} />
      
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setIsOpen(true)
            if (!e.target.value) {
              setSelectedValue('')
            }
          }}
          onFocus={() => setIsOpen(true)}
          required={required && !selectedValue}
          style={{ paddingRight: '2.5rem' }}
        />
        {selectedValue ? (
          <button
            type="button"
            onClick={handleClear}
            style={{
              position: 'absolute',
              right: '0.5rem',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
            }}
          >
            <X size={16} />
          </button>
        ) : (
          <div
            style={{
              position: 'absolute',
              right: '0.75rem',
              color: '#cbd5e1',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Search size={16} />
          </div>
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            maxHeight: '220px',
            overflowY: 'auto',
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 1000,
          }}
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => {
              const isSelected = opt.value === selectedValue
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: '0.6rem 0.75rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                    color: isSelected ? 'var(--primary)' : '#334155',
                    fontWeight: isSelected ? 600 : 400,
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc'
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {opt.label}
                </div>
              )
            })
          ) : (
            <div style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
              Aucun résultat trouvé
            </div>
          )}
        </div>
      )}
    </div>
  )
}
