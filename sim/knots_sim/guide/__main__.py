from .export import main
import sys

if __name__ == "__main__":
    main(int(sys.argv[sys.argv.index("--k") + 1]) if "--k" in sys.argv else 32)
