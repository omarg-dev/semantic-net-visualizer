import json
import os
from semantic_net import SemanticNet

class ProjectManager:
    def __init__(self, projects_dir):
        self.projects_dir = projects_dir
        if not os.path.exists(self.projects_dir):
            os.makedirs(self.projects_dir)

    def get_projects(self):
        files = []
        if not os.path.exists(self.projects_dir):
            return files
            
        for f in os.listdir(self.projects_dir):
            if not f.endswith(".snet"):
                continue
            
            full_path = os.path.join(self.projects_dir, f)
            try:
                with open(full_path, "r") as file:
                    data = json.load(file)
            
                name = f.replace(".snet", "")
                preview = data.get("preview_b64", "")
                created_at = os.path.getctime(full_path)

                files.append({
                    "name": name,
                    "filename": f,
                    "preview_b64": preview,
                    "created_at": created_at
                })
            except Exception as e:
                print(f"Error reading {f}: {e}")
                continue
        
        # Sort by creation time (oldest first)
        files.sort(key=lambda x: x["created_at"])
        return files

    def export_project(self, filename, data):
        file_path = os.path.join(self.projects_dir, filename)
        try:
            with open(file_path, "w") as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error exporting project to {filename}: {e}")
            return False

    def save_to_projects(self, data, path=None, filename=None):
        name = filename or data.get("name", "Untitled")
        filename = filename or f"{name}.snet"
        file_path = os.path.join(path or self.projects_dir, filename)
        
        with open(file_path, "w") as f:
            json.dump(data, f, indent=2)
        return True

    def load_project(self, filename):
        path = os.path.join(self.projects_dir, filename)
        data = None
        
        if not os.path.exists(path):
            return None
        try:
            with open(path, "r") as f:
                data = json.load(f)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            return None
            
        net = SemanticNet()

        # Load Nodes (with colors/metadata)
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])

        for n in nodes:
            # Extract attributes, defaulting if missing
            node_id = n.get("id")
            if not node_id: continue
            
            color = n.get("color", "#808080")
            # save positions just in case (might need in the future)
            x = n.get("x")
            y = n.get("y")
            
            net.add_node(node_id, color=color)

        # Load Edges
        for e in edges:
            net.add_relation(
                e.get("source"),
                e.get("relation"),
                e.get("target"),
                type=e.get("type", "manual"),
                inferred=e.get("dashes", False)
            )

        return net
