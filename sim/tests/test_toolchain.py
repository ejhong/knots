"""The numerical stack the models rely on: stiff integration, symbolic models with code generation, and sampling."""

import numpy as np
import sympy as sp
from SALib.sample import sobol
from scipy.integrate import solve_ivp


def test_stiff_solver_matches_the_exact_solution():
    # Stiff on purpose: a fast decay (1e4 per s) beside a slow one (1 per s), like a vessel beside its collar.
    rates = np.array([1e4, 1.0])
    sol = solve_ivp(lambda t, y: -rates * y, (0, 2), [1.0, 1.0], method="Radau", rtol=1e-8, atol=1e-10)
    assert sol.success
    np.testing.assert_allclose(sol.y[:, -1], np.exp(-rates * 2), atol=1e-8)
    assert sol.t.size < 500  # an explicit method would need tens of thousands of steps


def test_one_symbolic_model_gives_numeric_and_javascript_code():
    # The fold normal form: between its two folds it has two stable states, the shape of a switch.
    x, s = sp.symbols("x s")
    rhs = s + x - x**3
    f = sp.lambdify((x, s), rhs, "numpy")
    assert f(1.0, 0.0) == 0.0
    js = sp.jscode(rhs)
    assert "Math.pow(x, 3)" in js and "**" not in js


def test_sobol_sampling():
    problem = {"num_vars": 2, "names": ["a", "b"], "bounds": [[0, 1], [0, 1]]}
    X = sobol.sample(problem, 8, calc_second_order=False, seed=1)
    assert X.shape == (8 * (2 + 2), 2)
    assert ((X >= 0) & (X <= 1)).all()
