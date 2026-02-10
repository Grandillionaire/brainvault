import React, { useMemo, useRef, useCallback, useState, useEffect } from "react";
import ForceGraph3D from "react-force-graph-3d";
import { motion, AnimatePresence } from "framer-motion";
import { useNotesStore } from "../../stores/notesStore";
import { useUIStore } from "../../stores/uiStore";
import { GraphData, GraphNode, GraphLink, Note } from "../../types";
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface HoveredNote {
  note: Note;
  position: { x: number; y: number };
}

export const GraphView: React.FC = () => {
  const { notes, setCurrentNote } = useNotesStore();
  const { graphViewOpen, closeGraphView } = useUIStore();
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showOrphans, setShowOrphans] = useState(true);
  const [is3D, setIs3D] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [hoveredNote, setHoveredNote] = useState<HoveredNote | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState<Set<string>>(new Set());

  // Build graph data from notes
  const graphData = useMemo((): GraphData => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Filter notes by selected tags
    const filteredNotes =
      selectedTags.length > 0
        ? notes.filter((note) => note.tags.some((tag) => selectedTags.includes(tag)))
        : notes;

    // Create nodes
    filteredNotes.forEach((note) => {
      const connectionCount = note.links.length + note.backlinks.length;
      const node: GraphNode = {
        id: note.id,
        name: note.title,
        val: Math.max(connectionCount + 1, 3), // Minimum size
        color: getColorByTag(note.tags[0]),
        group: note.tags[0] ? hashString(note.tags[0]) % 7 : 0,
      };
      nodes.push(node);
      nodeMap.set(note.id, node);
    });

    // Create links
    filteredNotes.forEach((note) => {
      note.links.forEach((linkedTitle) => {
        const linkedNote = notes.find((n) => n.title === linkedTitle);
        if (linkedNote && nodeMap.has(linkedNote.id)) {
          links.push({
            source: note.id,
            target: linkedNote.id,
            value: 1,
          });
        }
      });
    });

    // Filter orphan nodes if needed
    if (!showOrphans) {
      const connectedNodeIds = new Set<string>();
      links.forEach((link) => {
        connectedNodeIds.add(link.source as string);
        connectedNodeIds.add(link.target as string);
      });

      return {
        nodes: nodes.filter((node) => connectedNodeIds.has(node.id)),
        links,
      };
    }

    return { nodes, links };
  }, [notes, selectedTags, showOrphans]);

  // Get all unique tags for filter
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  // Get tag statistics
  const tagStats = useMemo(() => {
    const stats = new Map<string, number>();
    notes.forEach((note) => {
      note.tags.forEach((tag) => {
        stats.set(tag, (stats.get(tag) || 0) + 1);
      });
    });
    return stats;
  }, [notes]);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: any) => {
      const note = notes.find((n) => n.id === node.id);
      if (note) {
        setCurrentNote(note);
        closeGraphView();
      }
    },
    [notes, setCurrentNote, closeGraphView]
  );

  // Track mouse position for hover preview
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Handle node hover with preview
  const handleNodeHover = useCallback(
    (node: any) => {
      if (node) {
        const note = notes.find((n) => n.id === node.id);
        if (note) {
          setHoveredNote({
            note,
            position: mousePos,
          });

          // Highlight connected nodes
          const connectedIds = new Set<string>([node.id]);
          const linkIds = new Set<string>();

          graphData.links.forEach((link) => {
            const sourceId = typeof link.source === "object" ? (link.source as any).id : link.source;
            const targetId = typeof link.target === "object" ? (link.target as any).id : link.target;
            
            if (sourceId === node.id) {
              connectedIds.add(targetId);
              linkIds.add(`${sourceId}-${targetId}`);
            }
            if (targetId === node.id) {
              connectedIds.add(sourceId);
              linkIds.add(`${sourceId}-${targetId}`);
            }
          });

          setHighlightedNodes(connectedIds);
          setHighlightedLinks(linkIds);
        }
      } else {
        setHoveredNote(null);
        setHighlightedNodes(new Set());
        setHighlightedLinks(new Set());
      }
    },
    [notes, graphData, mousePos]
  );

  // Zoom controls
  const handleZoomIn = () => {
    if (graphRef.current?.cameraPosition) {
      const currentPos = graphRef.current.cameraPosition();
      if (currentPos?.z) {
        const newZ = currentPos.z / 1.3;
        graphRef.current.cameraPosition({ z: newZ }, undefined, 300);
        setZoomLevel((prev) => Math.min(prev + 20, 200));
      }
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current?.cameraPosition) {
      const currentPos = graphRef.current.cameraPosition();
      if (currentPos?.z) {
        const newZ = currentPos.z * 1.3;
        graphRef.current.cameraPosition({ z: newZ }, undefined, 300);
        setZoomLevel((prev) => Math.max(prev - 20, 20));
      }
    }
  };

  const handleFitView = () => {
    if (graphRef.current?.zoomToFit) {
      graphRef.current.zoomToFit(400, 50);
      setZoomLevel(100);
    }
  };

  const handleResetView = () => {
    setSelectedTags([]);
    setShowOrphans(true);
    handleFitView();
  };

  // Node appearance based on highlight state
  const getNodeColor = useCallback(
    (node: GraphNode) => {
      if (highlightedNodes.size === 0) return node.color || "#3b82f6";
      return highlightedNodes.has(node.id) ? (node.color || "#3b82f6") : "#4a5568";
    },
    [highlightedNodes]
  );

  const getLinkWidth = useCallback(
    (link: GraphLink) => {
      if (highlightedLinks.size === 0) return 1;
      const sourceId = typeof link.source === "object" ? (link.source as GraphNode).id : link.source;
      const targetId = typeof link.target === "object" ? (link.target as GraphNode).id : link.target;
      return highlightedLinks.has(`${sourceId}-${targetId}`) ? 2 : 0.5;
    },
    [highlightedLinks]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (!graphViewOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeGraphView();
      } else if (e.key === "=" || e.key === "+") {
        handleZoomIn();
      } else if (e.key === "-") {
        handleZoomOut();
      } else if (e.key === "0") {
        handleFitView();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [graphViewOpen, closeGraphView]);

  if (!graphViewOpen) return null;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-background"
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute top-0 left-0 right-0 h-14 bg-background/90 backdrop-blur-md border-b flex items-center justify-between px-4 z-50"
      >
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Graph View</h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary" />
              {graphData.nodes.length} notes
            </span>
            <span className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-muted-foreground" />
              {graphData.links.length} links
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Tag Filter Dropdown */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                selectedTags.length > 0
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent"
              )}
            >
              <Filter className="w-4 h-4" />
              {selectedTags.length > 0 ? `${selectedTags.length} tags` : "Filter"}
              <ChevronDown className={cn("w-3 h-3 transition-transform", filterOpen && "rotate-180")} />
            </motion.button>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-full right-0 mt-2 w-64 bg-popover border rounded-xl shadow-lg p-3 z-50"
                >
                  <div className="text-sm font-medium mb-3">Filter by Tags</div>
                  <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-thin">
                    {allTags.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No tags found. Add #tags to your notes.
                      </p>
                    ) : (
                      allTags.map((tag) => (
                        <label
                          key={tag}
                          className="flex items-center justify-between gap-2 p-2 hover:bg-accent rounded-lg cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedTags.includes(tag)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTags([...selectedTags, tag]);
                                } else {
                                  setSelectedTags(selectedTags.filter((t) => t !== tag));
                                }
                              }}
                              className="w-4 h-4 rounded border-2 text-primary focus:ring-primary"
                            />
                            <span className="text-sm">#{tag}</span>
                          </div>
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {tagStats.get(tag)}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedTags.length > 0 && (
                    <button
                      onClick={() => setSelectedTags([])}
                      className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View Options */}
          <div className="flex items-center gap-1 border-l pl-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowOrphans(!showOrphans)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                showOrphans ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"
              )}
              title={showOrphans ? "Hide orphan notes" : "Show orphan notes"}
            >
              {showOrphans ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIs3D(!is3D)}
              className={cn(
                "p-2 rounded-lg transition-colors",
                is3D ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"
              )}
              title={is3D ? "Switch to 2D" : "Switch to 3D"}
            >
              <Layers className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-l pl-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleZoomIn}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </motion.button>

            <span className="text-xs text-muted-foreground w-10 text-center">{zoomLevel}%</span>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleZoomOut}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleFitView}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Fit to View (0)"
            >
              <Maximize2 className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleResetView}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Close Button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={closeGraphView}
            className="p-2 hover:bg-accent rounded-lg ml-2 transition-colors"
            aria-label="Close graph view"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </motion.div>

      {/* Graph */}
      <div className="absolute inset-0 top-14">
        <ForceGraph3D
          ref={graphRef}
          graphData={graphData as any}
          nodeLabel="name"
          nodeColor={(node: any) => getNodeColor(node as GraphNode)}
          nodeRelSize={6}
          nodeResolution={16}
          linkOpacity={0.3}
          linkWidth={(link: any) => getLinkWidth(link as GraphLink)}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          linkDirectionalParticleWidth={2}
          onNodeClick={handleNodeClick}
          onNodeHover={(node: any, prevNode: any) => {
            // prevNode is unused but required by the type
            void prevNode;
            handleNodeHover(node);
          }}
          enableNodeDrag={true}
          enableNavigationControls={true}
          showNavInfo={false}
          backgroundColor="rgba(0,0,0,0)"
        />
      </div>

      {/* Note Preview Tooltip */}
      <AnimatePresence>
        {hoveredNote && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{
              left: Math.min(hoveredNote.position.x + 15, window.innerWidth - 320),
              top: Math.min(hoveredNote.position.y + 15, window.innerHeight - 200),
            }}
            className="fixed z-50 w-80 bg-popover/95 backdrop-blur-md border rounded-xl shadow-xl p-4 pointer-events-none"
          >
            <h3 className="font-semibold text-base mb-2 line-clamp-1">
              {hoveredNote.note.title}
            </h3>
            
            {/* Tags */}
            {hoveredNote.note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {hoveredNote.note.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
                {hoveredNote.note.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{hoveredNote.note.tags.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Content Preview */}
            <p className="text-sm text-muted-foreground line-clamp-3">
              {hoveredNote.note.content.replace(/[#\[\]]/g, "").slice(0, 150)}...
            </p>

            {/* Stats */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t text-xs text-muted-foreground">
              <span>{hoveredNote.note.links.length} outgoing links</span>
              <span>{hoveredNote.note.backlinks.length} backlinks</span>
            </div>

            <p className="text-[10px] text-muted-foreground mt-2">
              Click to open • Updated {new Date(hoveredNote.note.updatedAt).toLocaleDateString()}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-md p-4 rounded-xl border shadow-lg"
      >
        <div className="text-sm font-semibold mb-3">Legend</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span>Untagged notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-500 to-violet-500" />
            <span>Tagged notes (color by tag)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-muted-foreground/50" />
            <span>Link between notes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div className="w-2 h-0.5 bg-primary/50 self-center" />
            </div>
            <span>Link direction</span>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="mt-4 pt-3 border-t text-[10px] text-muted-foreground">
          <p><kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">+</kbd>/<kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">-</kbd> Zoom • <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">0</kbd> Fit • <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> Close</p>
        </div>
      </motion.div>

      {/* Empty state */}
      {graphData.nodes.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="text-center p-8 bg-background/80 backdrop-blur rounded-xl border max-w-md">
            <Layers className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No notes to display</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {selectedTags.length > 0
                ? "No notes match the selected tags. Try removing some filters."
                : "Create some notes and connect them with [[wiki links]] to see your knowledge graph."}
            </p>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

// Helper function to get color by tag
function getColorByTag(tag?: string): string {
  if (!tag) return "#3b82f6"; // blue

  const colors = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // emerald
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
    "#6366f1", // indigo
  ];

  return colors[hashString(tag) % colors.length];
}

// Simple hash function for consistent colors
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
