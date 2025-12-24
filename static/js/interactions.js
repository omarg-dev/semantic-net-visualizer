const Interactions = {
    // tip bar
    showTip(text) {
        const tip = document.getElementById('tip-bar');
        if (tip) {
            tip.innerText = text;
            tip.classList.remove('hidden');
        }
    },

    hideTip() {
        const tip = document.getElementById('tip-bar');
        if (tip) tip.classList.add('hidden');
    },

    isModeActive: false,

    // Spawns a temporary input box at x,y
    showFloatingInput(x, y, defaultValue, callback) {
        const wrapper = document.getElementById('floating-wrapper');
        const input = document.getElementById('floating-input');
        
        if (!wrapper || !input) {
            console.error('floating input elements not found');
            return;
        }
        
        input.value = defaultValue || "";
        input.placeholder = "Node name";
        
        wrapper.style.left = x + 'px';
        wrapper.style.top = y + 'px';
        wrapper.classList.remove('hidden');

        input.focus();
        input.select();

        let finished = false;
        
        const cleanup = () => {
            wrapper.classList.add('hidden');
            input.removeEventListener('keydown', handleKeydown);
            input.removeEventListener('blur', handleBlur);
            wrapper.removeEventListener('mousedown', stopProp);
            wrapper.removeEventListener('dblclick', stopProp);
        };

        const finish = (val) => {
            if (finished) return;
            finished = true;
            cleanup();
            callback(val);
        };

        const handleKeydown = (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') finish(input.value.trim());
            if (e.key === 'Escape') finish(null);
        };

        const handleBlur = () => {
            // Small delay to allow button clicks to register if they didn't prevent default
            setTimeout(() => {
                if (!finished) finish(null);
            }, 100);
        };
        
        const stopProp = (e) => e.stopPropagation();
        wrapper.addEventListener('mousedown', stopProp);
        wrapper.addEventListener('dblclick', stopProp);

        input.addEventListener('keydown', handleKeydown);

        // Accept/Cancel buttons
        const acceptBtn = document.getElementById('input-accept');
        const cancelBtn = document.getElementById('input-cancel');
        
        // Prevent focus loss on mousedown, handle action on click
        const preventBlur = (e) => e.preventDefault();
        
        if (acceptBtn) {
            acceptBtn.onmousedown = preventBlur;
            acceptBtn.onclick = () => finish(input.value.trim());
        }
        if (cancelBtn) {
            cancelBtn.onmousedown = preventBlur;
            cancelBtn.onclick = () => finish(null);
        }
        
        input.addEventListener('blur', handleBlur);
    },

    // --- CUSTOM MODES ---

    // 1. Add Node Mode: Click anywhere -> Input -> Create
    startAddNodeMode(network, onNodeCreated) {
        this.isModeActive = true;
        this.showTip("Click anywhere to create a node");
        
        network.once('click', (params) => {
            this.hideTip();
            
            // If user clicked on an existing node/edge, ignore or cancel
            if (params.nodes.length > 0 || params.edges.length > 0) {
                this.isModeActive = false;
                return;
            }

            const pos = params.pointer.canvas;
            const dom = params.pointer.DOM;
            
            this.showFloatingInput(dom.x, dom.y, "", (name) => {
                this.isModeActive = false;
                if (name) onNodeCreated(name, pos.x, pos.y);
            });
        });
    },

    // 2. Link Mode: Source is pre-selected -> Click Target -> Input -> Create
    startLinkMode(network, sourceNodeId, callbacks) {
        this.isModeActive = true;
        this.showTip("Select a target node to connect");

        network.once('click', (params) => {
            this.hideTip();

            // Must click a node
            if (params.nodes.length === 0) {
                this.isModeActive = false;
                return;
            }

            const targetNodeId = params.nodes[0];

            // No self-loops
            if (sourceNodeId === targetNodeId) {
                this.isModeActive = false;
                return;
            }

            // Show edge immediately
            if (callbacks.onPreview) callbacks.onPreview(sourceNodeId, targetNodeId);

            // Calculate midpoint for input
            const nodeA = network.getPositions([sourceNodeId])[sourceNodeId];
            const nodeB = network.getPositions([targetNodeId])[targetNodeId];
            const domA = network.canvasToDOM(nodeA);
            const domB = network.canvasToDOM(nodeB);
            
            const midX = (domA.x + domB.x) / 2;
            const midY = (domA.y + domB.y) / 2;

            this.showFloatingInput(midX, midY, "is-a", (label) => {
                this.isModeActive = false;
                if (label) {
                    if (callbacks.onSuccess) callbacks.onSuccess(sourceNodeId, targetNodeId, label);
                } else {
                    if (callbacks.onCancel) callbacks.onCancel();
                }
            });
        });
    }
};

window.Interactions = Interactions;