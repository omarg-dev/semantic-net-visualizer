const App = {
    selectedNode: null,
    // border is the same as active color but a darker shade
    currentPalette: ["#666666", "#26465aff", "#a24f4fff", "#eb7044", "#204699ff", "#2c814bff"],


    // initialize the application
    async init() {
        Graph.init('network');
        
        // Load Data
        await this.loadGraphData();
        await this.loadProjects();
        
        // Setup Events
        this.setupGraphEvents();
        this.setupUIEvents();
        
        this.checkInference();
    },

    // load graph data from server
    async loadGraphData() {
        try {
            const data = await API.get('/get_graph');
            Graph.nodes.clear();
            Graph.edges.clear();
            
            Graph.nodes.add(data.nodes.map(n => ({
                id: n.id, label: n.label, color: n.color
            })));
            
            Graph.edges.add(data.edges.map(e => ({
                from: e.source, to: e.target, label: e.relation,
                dashes: e.dashes, 
                color: e.dashes ? { color: '#eb7044' } : undefined
            })));
        } catch (err) {
            console.error("Failed to load graph:", err);
        }
    },

    // graph event handlers
    setupGraphEvents() {
        const network = Graph.network;

        // Double Click -> Create Node
        network.on("doubleClick", (params) => {
            if (params.nodes.length > 0) return; // Ignore if clicked a node
            const pos = params.pointer.canvas;
            const dom = params.pointer.DOM;
            
            Interactions.showFloatingInput(dom.x, dom.y, "", (name) => {
                this.addNode(name, pos.x, pos.y);
            });
        });

        // Click -> Menus
        network.on("click", (params) => {
            if (Interactions.isModeActive) return;
            
            this.hideMenus();
            if (params.nodes.length > 0) {
                const nodeId = params.nodes[0];
                const domPos = network.canvasToDOM(network.getPositions([nodeId])[nodeId]);
                
                // Show Orbit via helper
                this.selectedNode = nodeId;
                const scale = network.getScale();
                Orbit.show(nodeId, domPos, this.currentPalette, (id, color) => this.updateNodeColor(id, color), scale);
                
            } else if (params.edges.length > 0) {
                const edgeId = params.edges[0];
                this.showEdgeMenu(edgeId, params.pointer.DOM);
            }
        });

        network.on("dragStart", () => this.hideMenus());
        network.on("zoom", () => this.hideMenus());
    },

    setupUIEvents() {
        // Buttons
        document.getElementById('btn-add-node').onclick = () => {
             Interactions.startAddNodeMode(Graph.network, (name, x, y) => this.addNode(name, x, y));
        };
        
        document.getElementById('btn-projects').onclick = () => document.getElementById('modal-projects').classList.remove('hidden');
        document.getElementById('btn-export').onclick = () => this.exportJSON();
        document.getElementById('file-upload').onchange = (e) => this.importFile(e);
        document.getElementById('btn-infer').onclick = () => this.runInference();

        // Context Actions
        document.getElementById('ctx-remove-node').onclick = () => this.removeSelectedNode();
        document.getElementById('ctx-remove-rel').onclick = () => this.removeSelectedEdge();
        
        // Link Mode
        document.getElementById('ctx-add-rel').onclick = () => {
            this.hideMenus();
            if (this.selectedNode) {
                let tempEdgeId = null;
                Interactions.startLinkMode(Graph.network, this.selectedNode, {
                    onPreview: (from, to) => {
                        tempEdgeId = 'temp_' + Date.now();
                        Graph.edges.add({ 
                            id: tempEdgeId, 
                            from, to, 
                            label: '...', 
                            color: { color: '#eb7044' },
                            dashes: true 
                        });
                    },
                    onSuccess: (from, to, label) => {
                        if (tempEdgeId) Graph.edges.remove(tempEdgeId);
                        this.addRelation(from, to, label);
                    },
                    onCancel: () => {
                        if (tempEdgeId) Graph.edges.remove(tempEdgeId);
                    }
                });
            }
        };
    },

    // graph manipulation methods
    async addNode(name, x, y) {
        if (!name) return;
        try {
            const defaultColor = "#666666";
            await API.post('/add_node', { name, color: defaultColor, x, y });
            if (!Graph.nodes.get(name)) {
                Graph.nodes.add({ id: name, label: name, color: defaultColor, x, y });
                this.checkInference();
            }
        } catch (err) { alert(err.message); }
    },

    async updateNodeColor(nodeId, color) {
        Graph.nodes.update({ id: nodeId, color: color });
        await API.post('/add_node', { name: nodeId, color: color });
    },

    async addRelation(from, to, label) {
        try {
            const res = await API.post('/add_relation', { source: from, target: to, relation: label });
            Graph.edges.add({ from, to, label });
            this.checkInference();
        } catch (err) { console.error(err); }
    },

    async removeSelectedNode() {
        if (!this.selectedNode) return;
        await API.post('/remove_node', { name: this.selectedNode });
        Graph.nodes.remove(this.selectedNode);
        this.hideMenus();
    },

    async removeSelectedEdge() {
        const menu = document.getElementById('edge-menu');
        const edgeId = menu.dataset.edgeId;
        const edge = Graph.edges.get(edgeId);
        if(!edge) return;

        await API.post('/remove_relation', { source: edge.from, target: edge.to, relation: edge.label });
        Graph.edges.remove(edgeId);
        this.hideMenus();
    },

    // helper to show/hide menus
    showEdgeMenu(edgeId, domPos) {
        const menu = document.getElementById('edge-menu');
        menu.style.left = domPos.x + 'px';
        menu.style.top = domPos.y + 'px';
        menu.dataset.edgeId = edgeId;
        menu.classList.remove('hidden');
    },

    hideMenus() {
        Orbit.hide();
        document.getElementById('edge-menu').classList.add('hidden');
    },

    
    async loadProjects() {
        const grid = document.getElementById('project-grid');
        while (grid.children.length > 1) grid.removeChild(grid.firstChild); // Clear old

        try {
            const list = await API.get('/get_projects');
            list.forEach(project => {
                const card = document.createElement('div');
                card.className = 'project-card';
                let content = `<div class="project-info">${project.name.replace('.snet', '')}</div>`;
                // convert b64 to img if exists
                if(project.preview_b64) {
                    content = `<img src="${project.preview_b64}" class="project-preview">` + content;
                }
                card.innerHTML = content;
                card.onclick = () => {
                    this.loadProjectFile(project.filename);
                    document.getElementById('modal-projects').classList.add('hidden');
                };
                grid.appendChild(card);
            });

            const importCard = document.getElementById('new-project');
            grid.removeChild(importCard);
            grid.appendChild(importCard);
        } catch (e) { console.error("No projects found"); }
    },

    async loadProjectFile(filename) {
        await API.post('/load', { filename });
        await this.loadGraphData();

        this.checkInference();
    },

    async importFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                
                // Construct payload matching the server's expected Schema
                const payload = {
                    name: file.name.replace('.snet', ''),
                    version: jsonContent.version || "UNKNOWN",
                    created_at: jsonContent.created_at || "",
                    preview_b64: jsonContent.preview_b64 || "",
                    palette: jsonContent.palette || [],
                    nodes: jsonContent.nodes || [],
                    edges: jsonContent.edges || [],
                };

                await API.post('/save', payload);
                
                alert("Import successful!");
                await this.loadProjects();
            } catch (err) {
                console.error(err);
                alert("Failed to import. Invalid file structure.");
            }
        };
        reader.readAsText(file);
    },

    async exportJSON() {
        const nodes = Graph.nodes.get();
        const edges = Graph.edges.get();
        const canvas = document.querySelector('#network canvas');
        const preview_b64 = canvas.toDataURL("image/png");

        const payload = {
            name: "",
            version: await API.get('/get_version'),
            created_at: new Date().toISOString(),
            palette: this.currentPalette,
            preview_b64: preview_b64,
            nodes: nodes.map(n => ({ id: n.id, color: n.color })),
            edges: edges.map(e => ({ source: e.from, target: e.to, relation: e.label, dashes: e.dashes })),
        };

        const res = await API.post('/export', payload);
        // trigger client-side download
        if(res.success) {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", (payload.name || "project") + ".snet");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            this.updateInferenceBadge(0);
        }
    },

    async runInference() {
        const res = await API.post('/inference');
        if(!res.new_edges || res.new_edges.length == 0) return;

        res.new_edges.forEach(e => {
            if(!Graph.edges.get().find(ex => ex.from === e.source && ex.to === e.target)) {
                Graph.edges.add({
                    from: e.source, to: e.target, label: e.relation, 
                    dashes: true, color: { color: '#' }
                });
            }
        });
        this.checkInference();
        alert(`Inferred ${res.new_edges.length} new connections!`);
    },
    
    updateInferenceBadge(count) {
        const btn = document.getElementById('btn-infer');
        const badge = document.getElementById('infer-badge');
        if (count > 0) {
            btn.classList.remove('hidden');
            badge.innerText = count;
        } else {
            btn.classList.add('hidden');
        }
    },

    async checkInference() {
        const res = await API.get('/check_inference');
        const count = res.count || 0;
        this.updateInferenceBadge(count);
    }
};

window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
document.addEventListener('DOMContentLoaded', () => App.init());