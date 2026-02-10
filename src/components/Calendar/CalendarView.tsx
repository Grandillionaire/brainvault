/**
 * Calendar View Component
 * Monthly calendar with note indicators and daily note integration
 */

import React, { useState, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileText,
  X,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Note } from "../../types";
import { useNotesStore } from "../../stores/notesStore";
import { cn } from "../../lib/utils";
import { getDailyNoteTitle, getDailyNoteContent } from "../../lib/templates";

interface CalendarViewProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DayInfo {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  notes: Note[];
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const CalendarView: React.FC<CalendarViewProps> = ({ isOpen, onClose }) => {
  const { notes, createNote, setCurrentNote } = useNotesStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get calendar days for current month view
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = new Date();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Start from Sunday of the week containing first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // End on Saturday of the week containing last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const days: DayInfo[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = current.toISOString().split("T")[0];
      const dailyNoteTitle = getDailyNoteTitle(current);

      // Find notes for this day
      const dayNotes = notes.filter((note) => {
        // Check if it's a daily note for this date
        if (note.title === dailyNoteTitle) return true;

        // Check created date
        const noteDate = new Date(note.createdAt).toISOString().split("T")[0];
        return noteDate === dateStr;
      });

      days.push({
        date: new Date(current),
        isCurrentMonth: current.getMonth() === month,
        isToday:
          current.getDate() === today.getDate() &&
          current.getMonth() === today.getMonth() &&
          current.getFullYear() === today.getFullYear(),
        notes: dayNotes,
      });

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate, notes]);

  // Navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Create or open daily note
  const handleDayClick = async (day: DayInfo) => {
    setSelectedDate(day.date);
  };

  const handleCreateDailyNote = async (date: Date) => {
    const title = getDailyNoteTitle(date);
    const existingNote = notes.find((n) => n.title === title);

    if (existingNote) {
      setCurrentNote(existingNote);
    } else {
      const content = getDailyNoteContent(date);
      const note = await createNote(title, content);
      setCurrentNote(note);
    }
    onClose();
  };

  const handleOpenNote = (note: Note) => {
    setCurrentNote(note);
    onClose();
  };

  // Selected day notes
  const selectedDayInfo = useMemo(() => {
    if (!selectedDate) return null;
    return calendarDays.find(
      (d) =>
        d.date.getDate() === selectedDate.getDate() &&
        d.date.getMonth() === selectedDate.getMonth() &&
        d.date.getFullYear() === selectedDate.getFullYear()
    );
  }, [selectedDate, calendarDays]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Calendar</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousMonth}
                className="p-1 hover:bg-accent rounded-md"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-medium min-w-[160px] text-center">
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button
                onClick={goToNextMonth}
                className="p-1 hover:bg-accent rounded-md"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={goToToday}
              className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-md hover:bg-primary/20"
            >
              Today
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Calendar Grid */}
          <div className="flex-1 p-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                const isSelected =
                  selectedDate &&
                  day.date.getDate() === selectedDate.getDate() &&
                  day.date.getMonth() === selectedDate.getMonth() &&
                  day.date.getFullYear() === selectedDate.getFullYear();

                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "relative aspect-square p-1 rounded-lg transition-colors",
                      day.isCurrentMonth
                        ? "hover:bg-accent"
                        : "text-muted-foreground/50 hover:bg-accent/50",
                      day.isToday && "ring-2 ring-primary",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <span className="text-sm">{day.date.getDate()}</span>

                    {/* Note indicators */}
                    {day.notes.length > 0 && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {day.notes.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              isSelected ? "bg-primary-foreground" : "bg-primary"
                            )}
                          />
                        ))}
                        {day.notes.length > 3 && (
                          <span
                            className={cn(
                              "text-[8px]",
                              isSelected ? "text-primary-foreground" : "text-primary"
                            )}
                          >
                            +
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details */}
          {selectedDate && (
            <div className="w-80 border-l p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">
                    {selectedDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                    })}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDayInfo?.notes.length || 0} notes
                  </p>
                </div>
                <button
                  onClick={() => handleCreateDailyNote(selectedDate)}
                  className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  title="Create daily note"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Notes list */}
              <div className="space-y-2">
                {selectedDayInfo?.notes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No notes on this day</p>
                    <button
                      onClick={() => handleCreateDailyNote(selectedDate)}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Create a daily note
                    </button>
                  </div>
                ) : (
                  selectedDayInfo?.notes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => handleOpenNote(note)}
                      className="w-full p-3 bg-muted/50 hover:bg-accent rounded-lg text-left transition-colors"
                    >
                      <h4 className="font-medium truncate">{note.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {note.content?.replace(/[#\[\]*_~`]/g, "").substring(0, 80)}...
                      </p>
                      {note.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {note.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30 text-sm text-muted-foreground">
          <span>Click a day to view notes or create a daily note</span>
          <span>
            {notes.length} total notes
          </span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
