#!/usr/bin/env python
import argparse
import os
import subprocess
import sys
from pathlib import Path


def python_in_venv(venv_dir: Path) -> Path:
    return venv_dir / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


def run(command, env=None):
    print("+", " ".join(str(part) for part in command))
    subprocess.run(command, check=True, env=env)


def main():
    parser = argparse.ArgumentParser(description="Export Nemotron Mini 4B to ONNX for Android.")
    parser.add_argument("--model", default="nvidia/Nemotron-Mini-4B-Instruct")
    parser.add_argument("--venv", default=".venv-nemotron")
    parser.add_argument("--output-root", default="dist")
    parser.add_argument("--skip-fp16", action="store_true")
    parser.add_argument("--context-window", type=int, default=2048)
    parser.add_argument("--required-ram-mb", type=int, default=8192)
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    venv_dir = repo_root / args.venv
    output_root = repo_root / args.output_root
    int4_dir = output_root / "nemotron-mini-int4"
    fp16_dir = output_root / "nemotron-mini-fp16"

    if not venv_dir.exists():
        run([sys.executable, "-m", "venv", str(venv_dir)])

    venv_python = python_in_venv(venv_dir)
    env = os.environ.copy()

    # Install ONNX conversion deps
    run([str(venv_python), "-m", "pip", "install", "-U",
         "olive-ai", "optimum", "transformers", "onnxruntime",
         "onnxruntime-genai", "huggingface_hub"], env=env)

    # Note: Hugging Face login not required for nvidia/Nemotron-Mini-4B-Instruct
    common = [
        str(venv_python), "-m", "olive", "auto-opt",
        "--model_name_or_path", args.model,
        "--task", "text-generation-with-past",
        "--trust_remote_code",
        "--device", "cpu",
        "--provider", "CPUExecutionProvider",
        "--use_ort_genai",
        "--log_level", "1",
    ]

    print("\n--- Exporting INT4 ---")
    run(common + [
        "--output_path", str(int4_dir),
        "--precision", "int4",
    ], env=env)

    if not args.skip_fp16:
        print("\n--- Exporting FP16 ---")
        run(common + [
            "--output_path", str(fp16_dir),
            "--precision", "fp16",
        ], env=env)

    manifest_script = repo_root / "scripts" / "generate-android-model-manifest.mjs"
    
    print("\n--- Generating Manifest for INT4 ---")
    run([
        "node", str(manifest_script),
        "--input", str(int4_dir),
        "--output", str(int4_dir / "manifest.json"),
        "--model-id", "nemotron-mini-int4",
        "--model-name", "Nemotron Mini 4B INT4",
        "--entry-file", "decoder_model_merged.onnx",
        "--tokenizer-file", "tokenizer.json",
        "--generation-config-file", "generation_config.json",
        "--tokenizer-config-file", "tokenizer_config.json",
        "--context-window", str(args.context_window),
        "--required-ram-mb", str(args.required_ram_mb),
    ], env=env)

    if not args.skip_fp16:
        print("\n--- Generating Manifest for FP16 ---")
        run([
            "node", str(manifest_script),
            "--input", str(fp16_dir),
            "--output", str(fp16_dir / "manifest.json"),
            "--model-id", "nemotron-mini-fp16",
            "--model-name", "Nemotron Mini 4B FP16",
            "--entry-file", "decoder_model_merged.onnx",
            "--tokenizer-file", "tokenizer.json",
            "--generation-config-file", "generation_config.json",
            "--tokenizer-config-file", "tokenizer_config.json",
            "--context-window", str(args.context_window),
            "--required-ram-mb", str(args.required_ram_mb + 2048),
        ], env=env)

    print("\nExport complete.")
    print(f"INT4: {int4_dir}")
    if not args.skip_fp16:
      print(f"FP16: {fp16_dir}")

if __name__ == "__main__":
    main()
