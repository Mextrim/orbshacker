"""Entry point for `python -m orbshacker`."""

import sys

from .bake import is_faked_game
from .timer import parse_timer_args

if "--timer-mode" in sys.argv or is_faked_game():
    from .timer import run_timer
    run_timer(parse_timer_args(sys.argv))
else:
    from .main import main
    main()
