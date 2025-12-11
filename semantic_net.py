import networkx as nx

# Note: most checks are handled in the frontend, so if you don't see them here, that's why.
class SemanticNet:
    def __init__(self):
        self.graph = nx.DiGraph()

    # Node Utilities
    def add_node(self, name):
        self.graph.add_node(name)

    def remove_node(self, name):
        self.graph.remove_node(name)

    # Relationship Utilities
    def add_relation(self, source, relation, target):
        self.graph.add_edge(source, target, relation=relation)

    def remove_relation(self, source, relation, target):
        self.graph.remove_edge(source, target)

    # Search / Query Utilities
    # Note: I only added the search functions because they were required, but I don't use them since the visualization shows all nodes/edges.
    def search_node(self, name):
        return name in self.graph

    def get_relations(self, node):
        if node not in self.graph:
            return []
        return [(node, data.get('relation'), target) for target, data in self.graph[node].items()]

    def find_by_relation(self, relation):
        return [(u, v) for u, v, data in self.graph.edges(data=True) if data.get('relation') == relation]
    
    # Inference Utility (bonus)
    # Note: I implemented inference for "is-a" relationships only with basic conflict handling
    def inference(self):
        new_edges = []
        conflicts = []

        # Create a list of all "is-a" edges
        is_a_edges = [(c, p) for c, p, d in self.graph.edges(data=True) if d.get('relation') == 'is-a']

        for child, parent in is_a_edges:
            for target, edge_data in self.graph[parent].items():
                rel = edge_data.get('relation')

                # Check if relation already exists
                if self.graph.has_edge(child, target):
                    existing = self.graph[child][target].get('relation')
                    # Check for conflicting relations
                    if existing != rel:
                        conflicts.append({
                            "child": child,
                            "target": target,
                            "existing_relation": existing,
                            "inferred_relation": rel
                        })
                    continue

                # Add inferred edge and mark it
                self.graph.add_edge(child, target, relation=rel, inferred=True)
                new_edges.append({
                    "source": child,
                    "target": target,
                    "relation": rel
                })

        return new_edges, conflicts