'use client';

import React, { useState } from 'react';
import {
  SectionConfig,
  SECTION_LABELS,
} from '../utils/template-studio-model';

interface SectionManagerProps {
  sections: SectionConfig[];
  onToggle: (sectionId: string, enabled: boolean) => void;
  onMove: (sectionId: string, direction: 'up' | 'down') => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  disabled?: boolean;
}

export function SectionManager({
  sections,
  onToggle,
  onMove,
  onReorder,
  disabled = false,
}: SectionManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (disabled) return;
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (disabled) return;
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorder(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="section-manager">
      <p style={{ fontSize: 'var(--admin-font-size-xs)', color: 'var(--admin-text-secondary)', marginBottom: 'var(--admin-space-md)' }}>
        Configure which sections appear on the invitation and their display order. Event Details is required and always enabled.
      </p>

      <div className="section-list" role="list" aria-label="Invitation Sections">
        {sortedSections.map((section, index) => {
          const isFirst = index === 0;
          const isLast = index === sortedSections.length - 1;
          const isEventDetails = section.id === 'eventDetails';
          const label = SECTION_LABELS[section.id] || section.id;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={section.id}
              role="listitem"
              draggable={!disabled}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`section-row ${!section.enabled ? 'section-row--disabled' : ''} ${
                isDragging ? 'section-row--dragging' : ''
              } ${isDragOver ? 'section-row--drag-over' : ''}`}
            >
              <div
                className="section-row__handle"
                title="Drag to reorder"
                aria-hidden="true"
              >
                ⋮⋮
              </div>

              <div className="section-row__label">
                {label}
              </div>

              {isEventDetails && (
                <span className="section-row__badge">Required</span>
              )}

              <div className="section-row__arrows">
                <button
                  type="button"
                  className="section-row__arrow"
                  disabled={disabled || isFirst}
                  onClick={() => onMove(section.id, 'up')}
                  aria-label={`Move ${label} section up`}
                  title="Move Up"
                >
                  ▲
                </button>
                <button
                  type="button"
                  className="section-row__arrow"
                  disabled={disabled || isLast}
                  onClick={() => onMove(section.id, 'down')}
                  aria-label={`Move ${label} section down`}
                  title="Move Down"
                >
                  ▼
                </button>
              </div>

              <label className="toggle" title={isEventDetails ? 'Event Details cannot be disabled' : undefined}>
                <input
                  type="checkbox"
                  className="toggle__input"
                  checked={section.enabled}
                  disabled={disabled || isEventDetails}
                  onChange={(e) => onToggle(section.id, e.target.checked)}
                  aria-label={`Enable ${label} section`}
                />
                <span className="toggle__slider" />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
