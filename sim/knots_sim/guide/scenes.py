"""The scenes (sim/PLAN.md §6): the same for every theory, in the shared unit of stress and the shared slow breath.

Stress: 0 is rest, 1 a surge that forms knots, `hold` (a setting's number) the stress that keeps them. The slow breath is
the exam's: 4 s in, 6 s out, starting halfway up an in-breath (`knots_sim.exam.breath_wave`), with minutes of it calming
(`exam.calm`). A scene says, at each moment, what is happening; each theory's runner turns that into its own inputs.
Scenes are things that happen to a model, not instructions.
"""

from __future__ import annotations

from dataclasses import dataclass

SURGE = (5.0, 185.0)  # three minutes of stress, as the exam's
SETTLED = 385.0  # then the holding stress for 200 s: the knots a scene that starts "formed" begins with


@dataclass(frozen=True)
class Scene:
    id: str
    name: str
    what: str  # what happens, in a sentence
    start: str  # "rest", or "formed": the knots a surge leaves, held at the holding stress
    duration: float  # s
    frame: float  # s between recorded frames
    film: bool = True  # shown as a film (or used for the character only)
    breath_until: float = 0.0  # slow breaths from 0 until then
    attend_until: float = 0.0  # attention at the spot
    hand_until: float = 0.0  # a hand resting on the spot
    work: bool = False  # the hand lifts once the knot at the spot has let go (for at most hand_until)
    roll_until: float = 0.0  # a roller over the quiet corner, pressing 1 s in every 3
    mood: bool = False  # stress wanders as moods do
    surge: bool = False  # the scene itself runs the surge (from rest)

    def level(self, t: float) -> str:
        """'rest', 'surge' or 'hold' at time t."""
        if self.surge:
            return "rest" if t < SURGE[0] else ("surge" if t < SURGE[1] else "hold")
        return "hold"

    def breathing(self, t: float) -> bool:
        return t < self.breath_until

    def attending(self, t: float) -> bool:
        return t < self.attend_until

    def hand(self, t: float) -> bool:
        return t < self.hand_until

    def rolling(self, t: float) -> bool:
        return t < self.roll_until and (t % 3.0) < 1.0


SCENES = (
    Scene("forms", "A knot forms", "Rest; then three minutes of stress; then the stress eases to a level that is held.",
          "rest", SETTLED, 1.0, surge=True),
    Scene("breathing", "Slow breathing", "Thirty slow breaths, four seconds in and six out, while the stress is held.",
          "formed", 310.0, 0.5, breath_until=300.0),
    Scene("attention", "Attention, no touch", "The same thirty breaths, with attention resting on the spot.",
          "formed", 310.0, 0.5, breath_until=300.0, attend_until=300.0),
    Scene("hand", "A resting hand", "A hand rests on the spot for a minute, with slow breaths; then it lifts.",
          "formed", 120.0, 0.5, breath_until=120.0, hand_until=60.0),
    Scene("rolling", "Rolling", "A roller presses a quiet corner once every three seconds for three minutes, then stops.",
          "formed", 300.0, 0.5, roll_until=180.0),
    Scene("after", "After one lets go", "A hand rests on the knot at the spot until it lets go (a minute at most); the slow "
          "breaths go on for ten minutes more.", "formed", 660.0, 1.0, breath_until=660.0, hand_until=60.0, work=True),
    Scene("moods", "An hour of moods", "For an hour the stress rises and falls, as moods do.",
          "formed", 3600.0, 5.0, mood=True),
    Scene("lingers", "Stress lingers", "Half an hour more at the holding stress.", "formed", 1800.0, 10.0, film=False),
)
BY_ID = {s.id: s for s in SCENES}
