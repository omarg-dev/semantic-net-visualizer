const Graph = {
    network: null,
    // The source of truth for the visual state
    nodes: new vis.DataSet([]),
    edges: new vis.DataSet([]),

    // Initialize the canvas
    init(containerId) {
        const container = document.getElementById(containerId);

        const data = {
            nodes: this.nodes,
            edges: this.edges
        };

        // Configuration ported from your original ui.js
        // ==============================
        // TODO: Adjust physics parameters as needed for optimal layout
        // ==============================
        const options = {
            physics: {
                enabled: true,
                stabilization: {
                    enabled: true,
                    iterations: 200
                },
                barnesHut: {
                    gravitationalConstant: -5000,
                    centralGravity: 0.005,
                    springLength: 100,
                    springConstant: 0.01,
                    damping: 0.1,
                    avoidOverlap: 0.2
                }
            },
            nodes: {
                shape: 'dot',
                size: 25,
                font: {
                    size: 16,
                    color: '#fff8d6',
                    face: 'Segoe UI',
                    strokeWidth: 0,
                    vadjust: -40
                },
                borderWidth: 2,
                color: {
                    background: '#666666',
                    border: '#fff8d6',
                    highlight: {
                        background: '#eb7044',
                        border: '#fff8d6'
                    }
                },
                shadow: true
            },
            edges: {
                width: 2,
                color: {
                    color: '#888888',
                    highlight: '#eb7044',
                    inherit: true
                },
                arrows: { to: { enabled: true, scaleFactor: 1 } },
                smooth: { type: 'continuous' }
            },
            interaction: {
                hover: true,
                selectConnectedEdges: false,
                multiselect: false
            }
        };

        this.network = new vis.Network(container, data, options);

        // Cursor interactions
        this.network.on("hoverNode", () => container.style.cursor = 'pointer');
        this.network.on("blurNode", () => container.style.cursor = 'default');
        this.network.on("hoverEdge", () => container.style.cursor = 'pointer');
        this.network.on("blurEdge", () => container.style.cursor = 'default');

        // Empty State Logic
        const emptyState = document.getElementById('empty-state');
        const updateEmptyState = () => {
            if (!emptyState) return;

            if (this.nodes.length === 0)
                emptyState.classList.remove('hidden');
            else 
                emptyState.classList.add('hidden');
        };

        this.nodes.on('add', updateEmptyState);
        this.nodes.on('remove', updateEmptyState);
        
        // Initial check
        updateEmptyState();

        return this.network;
    },

    // Helper: Reset the graph
    clear() {
        this.nodes.clear();
        this.edges.clear();
    }
};

window.Graph = Graph;