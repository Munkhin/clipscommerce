import React from 'react';
import { format, startOfWeek, addDays, getDate, getMonth, getYear, endOfMonth, startOfMonth, isSameDay, isSameMonth } from 'date-fns';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

interface Event {
  id: string;
  title: string;
  platform: string;
  date: string; // 'YYYY-MM-DD'
  time?: string; // 'HH:mm' (optional for month view)
}

interface MainGridProps {
  viewMode: 'day' | 'week' | 'month';
  currentDate: Date;
  events: Event[];
  platforms?: string[];
  onEventClick?: (event: Event) => void;
  onEventDrop?: (event: Event) => void;
}

// 7 AM to 6 PM
const HOURS = Array.from({ length: 12 }, (_, i) => {
  const hour = i + 7;
  if (hour === 12) return '12 PM';
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour > 12) return `${hour - 12} PM`;
  return `${hour} PM`;
});
const HOUR_TO_TIME = (label: string) => {
  // '7 AM' => '07:00', '12 PM' => '12:00', '1 PM' => '13:00', etc.
  const [h, period] = label.split(' ');
  let hour = parseInt(h, 10);
  if (period === 'AM' && hour === 12) hour = 0;
  if (period === 'PM' && hour !== 12) hour += 12;
  return `${hour.toString().padStart(2, '0')}:00`;
};
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function filterEvents(events: Event[], platforms?: string[]) {
  if (!platforms || platforms.length === 0) return events;
  return events.filter(e => platforms.includes(e.platform));
}

function DraggableEvent({ event, children }: { event: Event; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: event.id, data: event });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={{ opacity: isDragging ? 0.5 : 1, cursor: 'grab' }}>
      {children}
    </div>
  );
}

function DroppableCell({ id, onDrop, isOver, children }: { id: string; onDrop: (data: any) => void; isOver: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver: dndOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ background: isOver || dndOver ? '#a5b4fc55' : undefined, minHeight: 32 }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => onDrop(e)}
    >
      {children}
    </div>
  );
}

export default function MainGrid({ viewMode, currentDate, events, platforms, onEventClick, onEventDrop }: MainGridProps) {
  const filteredEvents = filterEvents(events, platforms);
  const [draggedId, setDraggedId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  // DnD event handlers
  function handleDragStart(event: any) {
    setDraggedId(event.active.id);
  }
  function handleDragOver(event: any) {
    setOverId(event.over?.id || null);
  }
  function handleDragEnd(event: any) {
    setOverId(null);
    setDraggedId(null);
    if (!event.over) return;
    const dragged = events.find(e => e.id === event.active.id);
    if (!dragged) return;
    const over = event.over.id;
    // Cross-day: week/month view, over = date string
    // Within-day: day/week view, over = date+time string
    if (viewMode === 'month' || viewMode === 'week') {
      if (over.length === 10 && over !== dragged.date) {
        onEventDrop && onEventDrop({ ...dragged, date: over });
      }
      if (over.length > 10 && over !== `${dragged.date}_${dragged.time}`) {
        const [date, time] = over.split('_');
        onEventDrop && onEventDrop({ ...dragged, date, time });
      }
    } else if (viewMode === 'day') {
      if (over.length > 10 && over !== `${dragged.date}_${dragged.time}`) {
        const [date, time] = over.split('_');
        onEventDrop && onEventDrop({ ...dragged, date, time });
      }
    }
  }

  if (viewMode === 'day') {
    const dayLabel = format(currentDate, 'd MMMM yyyy');
    return (
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="font-bold text-lg mb-2">{dayLabel}</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            {HOURS.map(h => <div key={h}>{h}</div>)}
          </div>
          <div className="flex flex-col gap-1">
            {HOURS.map(h => {
              const time = HOUR_TO_TIME(h);
              const event = filteredEvents.find(e => e.date === format(currentDate, 'yyyy-MM-dd') && e.time === time);
              const cellId = `${format(currentDate, 'yyyy-MM-dd')}_${time}`;
              return (
                <DroppableCell key={h} id={cellId} isOver={overId === cellId} onDrop={() => {}}>
                  {event ? (
                    <DraggableEvent event={event}>
                      <div onClick={() => onEventClick && onEventClick(event)}>{event.title}</div>
                    </DraggableEvent>
                  ) : null}
                </DroppableCell>
              );
            })}
          </div>
        </div>
        {filteredEvents.length === 0 && <div className="text-gray-400 mt-4">No events</div>}
      </DndContext>
    );
  }

  if (viewMode === 'week') {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
    return (
      <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="font-bold text-lg mb-2">Week of {format(start, 'd MMM yyyy')}</div>
        <div className="grid grid-cols-8 gap-2">
          <div></div>
          {days.map((d, i) => <div key={i}>{WEEKDAYS[i]}</div>)}
          {HOURS.map(h => (
            <React.Fragment key={h}>
              <div>{h}</div>
              {days.map((d, i) => {
                const time = HOUR_TO_TIME(h);
                const event = filteredEvents.find(e => e.date === format(d, 'yyyy-MM-dd') && e.time === time);
                const cellId = `${format(d, 'yyyy-MM-dd')}_${time}`;
                return (
                  <DroppableCell key={i} id={cellId} isOver={overId === cellId} onDrop={() => {}}>
                    {event ? (
                      <DraggableEvent event={event}>
                        <div onClick={() => onEventClick && onEventClick(event)}>{event.title}</div>
                      </DraggableEvent>
                    ) : null}
                  </DroppableCell>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        {filteredEvents.length === 0 && <div className="text-gray-400 mt-4">No events</div>}
      </DndContext>
    );
  }

  // Month view
  const monthLabel = format(currentDate, 'MMMM yyyy');
  const firstDay = startOfMonth(currentDate);
  const lastDay = endOfMonth(currentDate);
  const daysInMonth = getDate(lastDay);
  const startWeekDay = (firstDay.getDay() + 6) % 7; // Make Monday first
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(firstDay, i));
  const grid = [];
  let week: JSX.Element[] = [];
  let dayIdx = 0;
  // Fill first week with blanks if needed
  for (let i = 0; i < startWeekDay; i++) {
    week.push(<div key={`empty-start-${i}`}></div>);
    dayIdx++;
  }
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    const dayNum = getDate(d);
    const event = filteredEvents.find(e => e.date === format(d, 'yyyy-MM-dd'));
    const cellId = format(d, 'yyyy-MM-dd');
    week.push(
      <DroppableCell key={dayNum} id={cellId} isOver={overId === cellId} onDrop={() => {}}>
        <div>{dayNum}</div>
        {event && (
          <DraggableEvent event={event}>
            <div onClick={() => onEventClick && onEventClick(event)}>{event.title}</div>
          </DraggableEvent>
        )}
      </DroppableCell>
    );
    dayIdx++;
    if (dayIdx % 7 === 0) {
      grid.push(<div key={`week-${i}`}>{week}</div>);
      week = [];
    }
  }
  // Fill last week with blanks if needed
  if (week.length > 0) {
    while (week.length < 7) week.push(<div key={`empty-end-${week.length}`}></div>);
    grid.push(<div key="last-week">{week}</div>);
  }
  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="font-bold text-lg mb-2">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((d, i) => <div key={i}>{d}</div>)}
        {grid}
      </div>
      {filteredEvents.length === 0 && <div className="text-gray-400 mt-4">No events</div>}
    </DndContext>
  );
} 