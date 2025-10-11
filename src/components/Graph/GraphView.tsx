import React, { useMemo, useRef, useCallback, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import { useNotesStore } from "../../stores/notesStore";
import { useUIStore } from "../../stores/uiStore";
import { GraphData, GraphNode, GraphLink } from "../../types";
import { X, ZoomIn, ZoomOut, Maximize2, Filter } from "lucide-react";

export const GraphView: React.FC = () => {
  const { notes, setCurrentNote } = useNotesStore();
  const { graphViewOpen, closeGraphView } = useUIStore();
  const graphRef = useRef<any>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showOrphans, setShowOrphans] = useState(true);
  const [is3D, setIs3D] = useState(true);

  // Build graph data from notes
  const graphData = useMemo((): GraphData => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();

    // Filter notes by selected tags
    const filteredNotes = selectedTags.length > 0
      ? notes.filter(note => note.tags.some(tag => selectedTags.includes(tag)))
      : notes;

    // Create nodes
    filteredNotes.forEach(note => {
      const node: GraphNode = {
        id: note.id,
        name: note.title,
        val: note.links.length + note.backlinks.length + 1,
        color: getColorByTag(note.tags[0]),
        group: note.tags[0] ? 1 : 0,
      };
      nodes.push(node);
      nodeMap.set(note.id, node);
    });

    // Create links
    filteredNotes.forEach(note => {
      note.links.forEach(linkedTitle => {
        const linkedNote = notes.find(n => n.title === linkedTitle);
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
      links.forEach(link => {
        connectedNodeIds.add(link.source);
        connectedNodeIds.add(link.target);
      });

      return {
        nodes: nodes.filter(node => connectedNodeIds.has(node.id)),
        links,
      };
    }

    return { nodes, links };
  }, [notes, selectedTags, showOrphans]);

  // Get all unique tags for filter
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  // Handle node click
  const handleNodeClick = useCallback((node: any) => {
    const note = notes.find(n => n.id === node.id);
    if (note) {
      setCurrentNote(note);
      closeGraphView();
    }
  }, [notes, setCurrentNote, closeGraphView]);

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    if (node) {
      // Highlight connected nodes
      const connectedNodeIds = new Set<string>();
      graphData.links.forEach(link => {
        if (link.source === node.id) connectedNodeIds.add(link.target);
        if (link.target === node.id) connectedNodeIds.add(link.source);
      });

      // Update node colors to highlight connections
      graphRef.current?.d3Force?.("charge")?.strength(node ? -500 : -300);
    }
  }, [graphData]);

  // Zoom controls
  const handleZoomIn = () => {
    if (graphRef.current && graphRef.current.cameraPosition) {
      const currentPos = graphRef.current.cameraPosition();
      if (currentPos && currentPos.z) {
        graphRef.current.cameraPosition({ z: currentPos.z / 1.2 }, 500);
      }
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current && graphRef.current.cameraPosition) {
      const currentPos = graphRef.current.cameraPosition();
      if (currentPos && currentPos.z) {
        graphRef.current.cameraPosition({ z: currentPos.z * 1.2 }, 500);
      }
    }
  };

  const handleFitView = () => {
    if (graphRef.current && graphRef.current.zoomToFit) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  if (!graphViewOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-background">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-background/80 backdrop-blur border-b flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Graph View</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {graphData.nodes.length} notes, {graphData.links.length} connections
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Tag Filter */}
          <div className="relative">
            <button className="p-2 hover:bg-accent rounded-md">
              <Filter className="w-4 h-4" />
            </button>
            <div className="absolute top-full right-0 mt-2 w-48 bg-popover border rounded-md shadow-lg p-2 hidden group-hover:block">
              <div className="text-sm font-semibold mb-2">Filter by Tags</div>
              {allTags.map(tag => (
                <label key={tag} className="flex items-center gap-2 p-1 hover:bg-accent rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTags([...selectedTags, tag]);
                      } else {
                        setSelectedTags(selectedTags.filter(t => t !== tag));
                      }
                    }}
                    className="w-3 h-3"
                  />
                  <span className="text-sm">{tag}</span>
                </label>
              ))}
            </div>
          </div>

          {/* View Options */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOrphans}
              onChange={(e) => setShowOrphans(e.target.checked)}
              className="w-3 h-3"
            />
            Show orphans
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={is3D}
              onChange={(e) => setIs3D(e.target.checked)}
              className="w-3 h-3"
            />
            3D
          </label>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border-l pl-2">
            <button
              onClick={handleZoomIn}
              className="p-1 hover:bg-accent rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1 hover:bg-accent rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleFitView}
              className="p-1 hover:bg-accent rounded"
              title="Fit to View"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={closeGraphView}
            className="p-2 hover:bg-accent rounded-md ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Graph */}
      <div className="absolute inset-0 top-14">
        <ForceGraph3D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="name"
          nodeAutoColorBy="group"
          nodeRelSize={6}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.005}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          enableNodeDrag={true}
          enableNavigationControls={true}
          showNavInfo={false}
          backgroundColor="rgba(0,0,0,0)"
        />
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur p-3 rounded-md border">
        <div className="text-sm font-semibold mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Default</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Tagged</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-0.5 bg-muted-foreground"></div>
            <span>Link</span>
          </div>
        </div>
      </div>
    </div>
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
  ];

  // Generate consistent color based on tag name
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}