const DailySummary = require('../models/DailySummary');
const FoodItem = require('../models/FoodItem');
const Exercise = require('../models/Exercise');
const Workout = require('../models/Workout');
const Nutrition = require('../models/Nutrition');

const getStartOfDay = (date) => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

function pickRandom(arr, n) {
  const copy = [...arr];
  const out = [];
  while (copy.length && out.length < n) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

exports.getTodayRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const today = getStartOfDay(new Date());
    const summary = await DailySummary.findOne({ userId, date: today }).lean();
    const consumed = summary?.caloriesConsumed || 0;
    const tdee = req.user.autoStats?.tdee || 2000;
    const remaining = Math.max(0, tdee - consumed);

    const startToday = new Date(today);
    const endToday = new Date(today);
    endToday.setUTCDate(endToday.getUTCDate() + 1);

    const todayMeals = await Nutrition.find({
      userId,
      date: { $gte: startToday, $lt: endToday },
    }).lean();

    let proteinToday = 0;
    todayMeals.forEach((m) => {
      proteinToday += m.macros?.protein || 0;
    });
    const proteinTarget = Math.max(1, Math.round((tdee * 0.25) / 4));
    const needProtein = proteinToday < proteinTarget * 0.6;

    const foodFilter = needProtein
      ? { protein: { $gte: 15 }, calories: { $lte: Math.max(remaining, 400) } }
      : { calories: { $lte: Math.max(Math.min(remaining, 500), 120), $gte: 50 } };

    const foodPool = await FoodItem.find({
      ...foodFilter,
    })
      .sort({ protein: -1, calories: 1 })
      .limit(40)
      .lean();

    const foodPicks = pickRandom(foodPool.length ? foodPool : await FoodItem.find().limit(30).lean(), 3).map(
      (f) => ({
        _id: f._id,
        name: f.name,
        calories: f.calories,
        protein: f.protein,
        category: f.category,
        reason: needProtein
          ? 'High protein to help reach your daily protein target.'
          : 'Fits remaining calorie budget for today.',
      })
    );

    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);

    const recentWorkouts = await Workout.find({
      userId,
      date: { $gte: weekAgo },
    })
      .select('muscleGroup date')
      .lean();

    const trainedGroups = new Set(
      recentWorkouts.map((w) => w.muscleGroup).filter(Boolean)
    );

    const allGroups = await Exercise.distinct('muscleGroup', { isActive: true });
    const neglected = allGroups.filter((g) => !trainedGroups.has(g));
    const targetGroup = neglected[0] || allGroups[0];

    const exercisePool = await Exercise.find({
      isActive: true,
      ...(targetGroup ? { muscleGroup: targetGroup } : {}),
    })
      .sort({ sortOrder: 1 })
      .limit(12)
      .lean();

    const exercisePicks = pickRandom(exercisePool, 2).map((e) => ({
      _id: e._id,
      name: e.name,
      muscleGroup: e.muscleGroup,
      type: e.type,
      targetMuscles: e.targetMuscles || [],
      defaultSets: e.defaultSets,
      defaultRepsMin: e.defaultRepsMin,
      defaultRepsMax: e.defaultRepsMax,
      restSeconds: e.restSeconds,
      caloriesPerSet: e.caloriesPerSet,
      reason:
        trainedGroups.size === 0
          ? 'Start the week with compound movement for this muscle group.'
          : `You have trained less "${e.muscleGroup}" in the last 7 days — balance your program.`,
    }));

    const rationale = [
      `Estimated TDEE ~${tdee} kcal; logged today ~${consumed} kcal (${remaining} kcal remaining).`,
      needProtein
        ? `Protein today ~${Math.round(proteinToday)} g vs rough target ~${proteinTarget} g — prioritizing protein-dense foods.`
        : 'Macro balance looks acceptable; suggestions focus on calorie-appropriate snacks or meals.',
      trainedGroups.size
        ? `Recent muscle groups trained: ${[...trainedGroups].slice(0, 5).join(', ') || '—'}.`
        : 'No workouts logged in the last 7 days — consider light full-body sessions.',
    ];

    res.json({
      success: true,
      data: {
        foods: foodPicks,
        exercises: exercisePicks,
        rationale,
        meta: {
          caloriesRemaining: remaining,
          proteinToday: Math.round(proteinToday * 10) / 10,
          proteinTargetApprox: proteinTarget,
          neglectedMuscleGroup: targetGroup || null,
        },
      },
    });
  } catch (err) {
    console.error('recommendationController:', err);
    res.status(500).json({ success: false, message: 'Failed to build recommendations' });
  }
};
