'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { X } from 'lucide-react'

type Tag = {
  id: string
  name: string
  color?: string | null
}

interface TagSelectorProps {
  allTags: Tag[]
  defaultValue?: string
  name?: string
  placeholder?: string
}

export default function TagSelector({ allTags, defaultValue = '', name = 'tags', placeholder = 'Ajouter un tag...' }: TagSelectorProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(
    defaultValue ? defaultValue.split(',').map(t => t.trim()).filter(Boolean) : []
  )
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredTags = allTags.filter(
    t => t.name.toLowerCase().includes(inputValue.toLowerCase()) && !selectedTags.includes(t.name)
  )

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim()
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed])
    }
    setInputValue('')
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const removeTag = (tagName: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tagName))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue) {
        addTag(inputValue)
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Retirer le dernier tag si on fait backspace sur un champ vide
      removeTag(selectedTags[selectedTags.length - 1])
    }
  }

  const getColor = (tagName: string) => {
    const tag = allTags.find(t => t.name === tagName)
    return tag?.color || '#e2e8f0'
  }

  return (
    <div className="tag-selector" ref={containerRef} style={{ position: 'relative' }}>
      {/* Hidden input pour compatibilité avec formData.get('tags') */}
      <input type="hidden" name={name} value={selectedTags.join(',')} />
      
      <div 
        className="form-control" 
        style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '0.5rem', 
          minHeight: '42px', 
          height: 'auto', 
          padding: '0.25rem 0.5rem',
          cursor: 'text',
          alignItems: 'center'
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map(tag => (
          <span 
            key={tag} 
            style={{ 
              backgroundColor: getColor(tag),
              color: '#1e293b', 
              padding: '0.25rem 0.5rem', 
              borderRadius: '9999px', 
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {tag}
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
            >
              <X size={14} />
            </button>
          </span>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedTags.length === 0 ? placeholder : ''}
          style={{
            flex: 1,
            minWidth: '120px',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            padding: '0.25rem'
          }}
        />
      </div>

      {isOpen && (inputValue || filteredTags.length > 0) && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          maxHeight: '200px',
          overflowY: 'auto',
          zIndex: 50,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }}>
          {filteredTags.map(tag => (
            <div 
              key={tag.id}
              onClick={() => addTag(tag.name)}
              style={{ 
                padding: '0.5rem 1rem', 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              className="hoverable-item"
            >
              <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: tag.color || '#e2e8f0' }} />
              {tag.name}
            </div>
          ))}
          {inputValue && !allTags.find(t => t.name.toLowerCase() === inputValue.toLowerCase()) && (
            <div 
              onClick={() => addTag(inputValue)}
              style={{ 
                padding: '0.5rem 1rem', 
                cursor: 'pointer',
                color: 'var(--primary)',
                fontWeight: 500
              }}
              className="hoverable-item"
            >
              Créer le tag "{inputValue}"
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .hoverable-item:hover {
          background-color: var(--background-hover);
        }
      `}} />
    </div>
  )
}
