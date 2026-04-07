#!/usr/bin/env python
import argparse
import json
import shutil
import subprocess
from pathlib import Path


def find_ollama() -> str:
    if shutil.which("ollama"):
        return "ollama"
    windows_candidate = Path.home() / "AppData" / "Local" / "Programs" / "Ollama" / "ollama.exe"
    if windows_candidate.exists():
        return str(windows_candidate)
    raise RuntimeError("Ollama executable not found. Install Ollama or add it to PATH.")


def run_ollama(prompt: str, model: str) -> str:
    completed = subprocess.run(
        [find_ollama(), "run", model, prompt],
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def main():
    parser = argparse.ArgumentParser(description="Generate Ollama baselines for Gemma 4 validation.")
    parser.add_argument("--model", default="gemma4:e2b")
    parser.add_argument("--prompts", default="scripts/gemma4-validation-prompts.json")
    parser.add_argument("--output", default="dist/gemma4-e2b-validation-baseline.json")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    prompts = json.loads((repo_root / args.prompts).read_text(encoding="utf-8"))
    rows = []

    for prompt in prompts:
        print(f"Running Ollama baseline: {prompt[:60]}...")
        rows.append({
            "prompt": prompt,
            "ollama_model": args.model,
            "ollama_output": run_ollama(prompt, args.model),
        })

    output_path = repo_root / args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nBaseline written: {output_path}")


if __name__ == "__main__":
    main()
