import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * It is not best practice to separate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizzes: 30%
 * - Homework: 20%
 */
    // Create indexes
    await db.collection("grades").createIndex({ class_id: 1 });
    await db.collection("grades").createIndex({ learner_id: 1 });
    // Compound index
    await db.collection("grades").createIndex({
      class_id: 1,
      learner_id: 1,
    });

    const schemaValidator = {
      $jsonSchema: {
        bsonType: "object",
        required: ["class_id", "learner_id"],
        properties: {
          class_id: {
            bsonType: "number",
            minimum: 0,
            maximum: 300,
            description: "must be a number between 0 and 300",
          },
          learner_id: {
            bsonType: "number", 
            minimum: 0,
            description: "must be a number greater than 0",
          },
          scores: {
            bsonType: "array",
            items: {
              bsonType: "object",
              required: ["type", "score"],
              properties: {
                type: {
                  bsonType: "string",
                  enum: ["exam", "quiz", "homework"],
                  description: "must be 'exam', 'quiz', or 'homework'",
                },
                score: {
                  bsonType: "number",
                  minimum: 0,
                  maximum: 100,
                  description: "must be a number between 0 and 100",
                },
              },
            },
          },
        },
      },
    };
    await db.command({
      collMod: "grades",
      validator: schemaValidator,
      validationLevel: "strict",
      validationAction: "error",
    });
    console.log("Indexes and schema validation created successfully.");

// Testing our schema validation here
async function Tests (){
  try {
    await db.collection("grades").insertMany([
      {
        class_id: 2,
        learner_id: 2,
        scores: [
          { type: "exam", score: 80 },
          { type: "quiz", score: 70 },
          { type: "homework", score: 90 },
          { type: "homework", score: 100 },
        ],
      },
     /* { Uncommenting this would make schema test fail and it will not insert anything
        class_id: "abc",
        learner_id: "aa",
        scores: [
          { type: "exam", score: 85 },
          { type: "quiz", score: 75 },
          { type: "homework", score: 95 },
          { type: "homework", score: 88 },
        ],
      },*/ 
    ]);
    console.log("Insert successful.");
  } catch (err) {
    console.error("Insert failed due to schema validation:", err);
  }
} Tests();

router.get("/learner/:id/avg-class", async (req, res) => {
    let collection = db.collection("grades");
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
                $cond: [
                  { $eq: ["$scores.type", "quiz"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
              },
            },
            exam: {
              $push: {
                $cond: [
                  { $eq: ["$scores.type", "exam"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
              },
            },
            homework: {
              $push: {
                $cond: [
                  { $eq: ["$scores.type", "homework"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
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
      else res.send({learners,percentage,totalLearners}).status(200);
});

router.get("/stats", async (req, res) => {
    let collection = db.collection("grades");
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
                $cond: [
                  { $eq: ["$scores.type", "quiz"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
              },
            },
            exam: {
              $push: {
                $cond: [
                  { $eq: ["$scores.type", "exam"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
              },
            },
            homework: {
              $push: {
                $cond: [
                  { $eq: ["$scores.type", "homework"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
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

    const totalLearners = (await collection.distinct("learner_id")).length;
    const percentage = (result.length / totalLearners) * 100;
    const learners = result.length;

    if (!result) res.send("Not found").status(404);
    else res.send({totalLearners,learners,percentage}).status(200);
 
});

router.get("/stats/:id", async (req, res) => {
    let collection = db.collection("grades");
    let class_Id = Number(req.params.id);

    let result = await collection
      .aggregate([
        {
          $match: { class_id: class_Id },
        },
        {
          $unwind: { path: "$scores" },
        },
        {
          $group: {
            _id: "$learner_id",
            quiz: {
              $push: {
                $cond: [
                  { $eq: ["$scores.type", "quiz"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
              },
            },
            exam: {
              $push: {
                $cond: [
                  { $eq: ["$scores.type", "exam"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
              },
            },
            homework: {
              $push: {
                $cond: [
                  { $eq: ["$scores.type", "homework"] },
                  "$scores.score",
                  "$$REMOVE",
                ],
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
      await collection.distinct("learner_id", { class_id: class_Id })
    ).length;
    const learners = result.length;
    const percentage = (learners / totalLearners) * 100;

    if (!result) res.send("Not found").status(404);
    else res.send({totalLearners,learners,percentage}).status(200);

});

export default router;
