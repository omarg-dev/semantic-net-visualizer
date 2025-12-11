# server.py
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from semantic_net import SemanticNet

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

net = SemanticNet()

# Setup semantic net
nodes = [
    "Character", "Hero", "Knight", "Wizard", "Merchant",
    "Enemy", "Goblin", "Dragon",
    "Item", "Sword", "Magic Staff", "Healing Potion", "Gold Coin", "Armor",
    "Ability", "Fireball", "Slash",
    "Location", "Forest", "Volcano"
]

edges = [
    ("Hero", "is-a", "Character"),
    ("Knight", "is-a", "Hero"),
    ("Wizard", "is-a", "Hero"),
    ("Merchant", "is-a", "Character"),
    ("Goblin", "is-a", "Enemy"),
    ("Dragon", "is-a", "Enemy"),
    ("Sword", "is-a", "Item"),
    ("Magic Staff", "is-a", "Item"),
    ("Healing Potion", "is-a", "Item"),
    ("Gold Coin", "is-a", "Item"),
    ("Armor", "is-a", "Item"),
    ("Slash", "is-a", "Ability"),
    ("Fireball", "is-a", "Ability"),
    ("Forest", "is-a", "Location"),
    ("Volcano", "is-a", "Location"),

    ("Knight", "has-a", "Sword"),
    ("Wizard", "has-a", "Magic Staff"),

    ("Goblin", "located-in", "Forest"),
    ("Dragon", "located-in", "Volcano"),
    ("Merchant", "located-in", "Forest"),

    ("Magic Staff", "can-use", "Fireball"),
    ("Sword", "can-use", "Slash"),
    ("Hero", "can-use", "Healing Potion"),
    ("Character", "can-use", "Armor"),

    ("Goblin", "drops", "Gold Coin"),
    ("Dragon", "drops", "Armor")
]

# Color coding setup (only for initial nodes)
NODE_COLORS = {

    "Character": "lightblue",
    "Merchant": "lightblue",
    "Hero": "lightblue",
    "Knight": "lightblue",
    "Wizard": "lightblue",

    "Enemy": "red",
    "Goblin": "red",
    "Dragon": "red",

    "Item": "orange",
    "Sword": "orange",
    "Magic Staff": "orange",
    "Armor": "orange",
    "Gold Coin": "orange",
    "Healing Potion": "orange",

    "Ability": "purple",
    "Slash": "purple",
    "Fireball": "purple",

    "Location": "lightgreen",
    "Forest": "lightgreen",
    "Volcano": "lightgreen"
}

for n in nodes:
    net.add_node(n)
for s, r, t in edges:
    net.add_relation(s, r, t)


@app.route("/")
def index():
    return render_template("index.html")

# API endpoints for frontend real-time manipulation
@app.route("/get_nodes")
def get_nodes():
    node_objs = []
    for n in net.graph.nodes:
        color = NODE_COLORS.get(n, "gray")
        node_objs.append({
            "id": n,
            "label": n,
            "color": color
        })
    return jsonify({"nodes": node_objs})

@app.route("/get_edges")
def get_edges():
    edges_list = [(u, v, d.get("relation")) for u, v, d in net.graph.edges(data=True)]
    return jsonify({"edges": edges_list})

@app.route("/add_node", methods=["POST"])
def add_node():
    data = request.get_json()
    name = data.get("name")
    if not name:
        return jsonify({"error": "Node name required"}), 400
    net.add_node(name)
    return jsonify({"success": True})

@app.route("/remove_node", methods=["POST"])
def remove_node():
    data = request.get_json()
    name = data.get("name")
    if not name:
        return jsonify({"error": "Node name required"}), 400
    net.remove_node(name)
    return jsonify({"success": True})

@app.route("/add_relation", methods=["POST"])
def add_relation():
    data = request.get_json()
    source = data.get("source")
    relation = data.get("relation")
    target = data.get("target")
    if not source or not relation or not target:
        return jsonify({"error": "Source, relation, and target required"}), 400
    try:
        net.add_relation(source, relation, target)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    return jsonify({"success": True})

@app.route("/remove_relation", methods=["POST"])
def remove_relation():
    data = request.get_json()
    source = data.get("source")
    relation = data.get("relation")
    target = data.get("target")
    if not source or not relation or not target:
        return jsonify({"error": "Source, relation, and target required"}), 400
    net.remove_relation(source, relation, target)
    return jsonify({"success": True})

@app.route("/inference", methods=["POST"])
def inference():
    new_edges, conflicts = net.inference()
    return jsonify({"new_edges": new_edges, "conflicts": conflicts})

if __name__ == "__main__":
    app.run()
