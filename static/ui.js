let nodes = new vis.DataSet([]);
let edges = new vis.DataSet([]);
let container = document.getElementById("network");

let data = {
    nodes: nodes,
    edges: edges
};

let options = {
    physics: {
        enabled: true,
        stabilization: {
            enabled: true,
            iterations: 200
        },
        barnesHut: {
            gravitationalConstant: -5000,
            centralGravity: 0.005,
            springLength: 150,
            springConstant: 0.04,
            damping: 0.3,
            avoidOverlap: 0.1
        }
    },
    nodes: { shape: "dot", size: 25, font: { size: 16, color: "#000" } },
    edges: { arrows: { to: true } }
};

let network = new vis.Network(container, data, options);

// Initialize network
async function initNetwork() {
    nodes.clear();
    edges.clear();

    const resNodes = await fetch("/get_nodes");
    const nodesData = await resNodes.json();

    const resEdges = await fetch("/get_edges");
    const edgesData = await resEdges.json();

    nodesData.nodes.forEach(n => {
        nodes.add(n);
    });
    edgesData.edges.forEach(e => edges.add({ from: e[0], to: e[1], label: e[2], arrows: "to" }));
}

// helper function for API calls
async function api(url, data = null) {
    const options = {
        method: "POST"
    };

    if (data) {
        options.headers = { "Content-Type": "application/json" };
        options.body = JSON.stringify(data);
    }

    const res = await fetch(url, options);
    return res.json();
}

// Node Manipulation Functions
function addNode() {
    const name = document.getElementById("nodeAdd").value.trim();
    const color = document.getElementById("nodeColor").value || "#808080";

    // Checks
    if (!name)
        return alert("Enter a node name");
    if (nodes.get(name))
        return alert("Node already exists");

    api("/add_node", { name})
    .then(res => {
        if (res.success) nodes.add({ id: name, label: name, color });
    });
}

function removeNode() {
    const name = document.getElementById("nodeRemove").value.trim();

    // Checks
    if (!name)
        return alert("Enter a node name");
    if (!nodes.get(name))
        return alert("Node does not exist");

    api("/remove_node", { name })
    .then(res => {
        if (res.success) nodes.remove({ id: name });
    });
}

function addRelation() {
    const from = document.getElementById("relFromAdd").value.trim();
    const rel = document.getElementById("relTypeAdd").value.trim();
    const to = document.getElementById("relToAdd").value.trim();

    // Checks
    if (!from || !rel || !to)
        return alert("Enter all fields");
    if (from === to)
        return alert("Cannot create relation to oneself");
    if (!nodes.get(from) || !nodes.get(to))
        return alert("Both nodes must exist");
    if (edges.get().some(e => e.from === from && e.to === to && e.label === rel))
        return alert("Relation already exists");

    api("/add_relation", { source: from, relation: rel, target: to })
    .then(res => {
        if (res.success) edges.add({ from, to, label: rel, arrows: "to" });
    });
}

function removeRelation() {
    const from = document.getElementById("relFromRemove").value.trim();
    const rel = document.getElementById("relTypeRemove").value.trim();
    const to = document.getElementById("relToRemove").value.trim();

    // Checks
    if (!from || !rel || !to)
        return alert("Enter all fields");
    if (!nodes.get(from) || !nodes.get(to))
        return alert("Both nodes must exist");
    if (!edges.get().some(e => e.from === from && e.to === to && e.label === rel))
        return alert("Relation does not exist");

    api("/remove_relation", { source: from, relation: rel, target: to })
    .then(res => {
        if (res.success) edges.get().forEach((e, idx) => {
            if (e.from === from && e.to === to && e.label === rel)
                edges.remove(edges.getIds()[idx]);
        });
    });
}

// Inference
function inference() {
    api("/inference").then(res => {
        res.new_edges.forEach(e => {
            edges.add({ from: e.source, to: e.target, label: e.relation + " [inferred]", color: "black", dashes: true });
        });

        res.conflicts.forEach(c => {
            // Avoid adding duplicate edges
            if (edges.get().some(edge => edge.from === c.child && edge.to === c.target && edge.label === c.inferred_relation + " [conflict]"))
                return;

            edges.add({ from: c.child, to: c.target, label: c.inferred_relation + " [conflict]", color: "red", dashes: true });
        });

        alert(`Inference complete: ${res.new_edges.length} added, ${res.conflicts.length} conflicts`);
    });
}
