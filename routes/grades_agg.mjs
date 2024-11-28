import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */
router.get("/learner/:id/avg-class", async (req, res) => {
    let collection = await db.collection("grades");
  
    let result = await collection
      .aggregate([
        {
          $match: { learner_id: Number(req.params.id) },
        },
        {
          $unwind: { path: "$scores" },
        },
        {
          $group: {
            _id: "$class_id",
            quiz: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "quiz"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
            exam: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "exam"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
            homework: {
              $push: {
                $cond: {
                  if: { $eq: ["$scores.type", "homework"] },
                  then: "$scores.score",
                  else: "$$REMOVE",
                },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            class_id: "$_id",
            avg: {
              $sum: [
                { $multiply: [{ $avg: "$exam" }, 0.5] },
                { $multiply: [{ $avg: "$quiz" }, 0.3] },
                { $multiply: [{ $avg: "$homework" }, 0.2] },
              ],
            },
          },
        },
      ])
      .toArray();
  
    if (!result) res.send("Not found").status(404);
    else res.send(result).status(200);
  });


router.get("/stats", async (req, res) => {
  let collection = await db.collection("grades");

  let result = await collection
    .aggregate([
      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$learner_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
     {
        $match:{
         avg: {$gte:70},
       },
      },
    ])
    .toArray();
  console.log(result)

  const totalLearners = (await collection.distinct("learner_id")).length;
  const percentage = (result.length / totalLearners) * 100;
  const learners = result.length;

  console.log(totalLearners)

  if (!result) res.send("Not found").status(404);
  else res.send({learners,percentage,totalLearners}).status(200);
});
router.get("/stats/:id", async (req, res) => {
  let collection = await db.collection("grades");
  let classId = Number(req.params.id);

  let result = await collection
    .aggregate([
      {
        $match: { class_id: classId },
      },
      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$learner_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
      {
        $match: {
          avg: { $gte: 70 },
        },
      },
    ])
    .toArray();

    const totalLearners = (
    await collection.distinct("class_id")).length;

  const learners = result.length;
  const percentage = (learners / totalLearners) * 100;

  if (!result) res.send("Not found").status(404);
  else res.send({totalLearners,learners,percentage}).status(200);
});

export default router;
