import React, { useRef, useCallback, useState, useEffect } from "react"
import { getGuess, fetchAllCrossword } from "../store/crossword"
import store from "../store"

import Crossword, {
  Cell,
  CrosswordImperative,
  CrosswordProvider,
} from "@jaredreisinger/react-crossword"
import { useSelector, useDispatch } from "react-redux"
import socket from "./socket"
import Timer from "./Timer"
import Scores from "./Scores"

export default function MyPage(props) {
  const dispatch = useDispatch()
  const crosswords = useSelector((state) => state.dataReducer.allCrossword)
  const room = window.localStorage.getItem("roomId")

  const crossword = useRef(null)

  const selectedPuzzle = JSON.parse(window.localStorage.getItem("puzzle"))
  const puzzleData = JSON.parse(selectedPuzzle.data)
  const playerColor = window.localStorage.getItem("color").split(" ")

  useEffect(() => {
    dispatch(fetchAllCrossword())

    window.localStorage.setItem("correctClues", "[]")
    window.localStorage.setItem("correctCells", "[]")
    let crosswordSvg = document.querySelector("div.crossword svg")
    console.log(crosswordSvg)

    const wincheck = setInterval(() => {
      const corrects = JSON.parse(window.localStorage.getItem("correctClues"))
      console.log(
        corrects.length,
        " vs ",
        [...Object.keys(puzzleData.across)].length +
          [...Object.keys(puzzleData.down)].length
      )
      if (
        corrects.length >=
        [...Object.keys(puzzleData.across)].length +
          [...Object.keys(puzzleData.down)].length
      ) {
        console.log("DONE")
        socket.emit("game-over", { roomId: room })
      }
    }, 1000)

    socket.on("show-results", () => {
      props.history.push(`/results/${room}`)
    })

    socket.on("newWord", (payload) => {
      const corrects = JSON.parse(window.localStorage.getItem("correctClues"))
      const newCorrect = `${payload.number} ${payload.direction}`
      const cells = JSON.parse(window.localStorage.getItem("correctCells"))
      if (!corrects.includes(newCorrect)) {
        corrects.push(newCorrect)
        window.localStorage.setItem("correctClues", JSON.stringify(corrects))
      }
      if (payload.direction === "across") {
        const start = [
          puzzleData.across[payload.number].row,
          puzzleData.across[payload.number].col,
        ]
        let line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        )

        let x1 = start[1] * 6.666 + 3.325
        let y1 = start[0] * 6.666 + 3.325
        line.setAttribute("x1", x1)
        line.setAttribute("y1", y1)
        line.setAttribute("opacity", "0.5")
        line.setAttribute("stroke", payload.color)

        for (let i = 0; i < payload.answer.length; i++) {
          crossword.current?.setGuess(start[0], start[1], payload.answer[i])
          cells.push(`${start[0]}, ${start[1]}, ${payload.answer[i]}`)
          if (i === payload.answer.length - 1) {
            let x2 = start[1] * 6.666 + 3.325
            let y2 = start[0] * 6.666 + 3.325
            line.setAttribute("x2", x2)
            line.setAttribute("y2", y2)
            crosswordSvg.appendChild(line)
          }
          start[1]++
        }
      } else {
        const start = [
          puzzleData.down[payload.number].row,
          puzzleData.down[payload.number].col,
        ]
        let line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line"
        )

        let x1 = start[1] * 6.666 + 3.325
        let y1 = start[0] * 6.666 + 3.325
        line.setAttribute("x1", x1)
        line.setAttribute("y1", y1)
        line.setAttribute("opacity", "0.5")
        line.setAttribute("stroke", payload.color)

        for (let i = 0; i < payload.answer.length; i++) {
          crossword.current?.setGuess(start[0], start[1], payload.answer[i])
          cells.push(`${start[0]}, ${start[1]}, ${payload.answer[i]}`)
          if (i === payload.answer.length - 1) {
            let x2 = start[1] * 6.666 + 3.325
            let y2 = start[0] * 6.666 + 3.325
            line.setAttribute("x2", x2)
            line.setAttribute("y2", y2)
            crosswordSvg.appendChild(line)
          }
          start[0]++
        }
      }
      window.localStorage.setItem("correctCells", JSON.stringify(cells))
    })

    return function cleanup() {
      clearInterval(wincheck)
    }
  }, [])

  const theme = {
    gridBackground: playerColor[0],
    focusBackground: playerColor[1],
    highlightBackground: playerColor[1],
    numberColor: playerColor[0],
    textColor: playerColor[0],
    paddingTop: "1in",
  }

  const onCellChange = (row, col, char) => {
    console.log(row, col, char)
    const cells = JSON.parse(window.localStorage.getItem("correctCells"))
    if (
      cells.some(
        (cell) => cell.split(", ").slice(0, 2).join(", ") === `${row}, ${col}`
      )
    ) {
      console.log("ALREADY CORRECT")
      const correctLetter = cells
        .find(
          (cell) => cell.split(", ").slice(0, 2).join(", ") === `${row}, ${col}`
        )
        .split(", ")
        .slice(2)
        .join("")
      console.log(correctLetter)
      if (char !== correctLetter) {
        setTimeout(() => {
          crossword.current?.setGuess(row, col, correctLetter)
        }, 10)
      }
    }
  }

  const onCorrect = (direction, number, answer) => {
    const corrects = JSON.parse(window.localStorage.getItem("correctClues"))
    const newCorrect = `${number} ${direction}`
    if (!corrects.includes(newCorrect)) {
      console.log("CORRECT")
      socket.emit("correctWord", {
        direction,
        number,
        answer,
        roomId: room,
        id: socket.id,
        color: playerColor[0],
      })
      corrects.push(newCorrect)
    }
    window.localStorage.setItem("correctClues", JSON.stringify(corrects))
  }
  return (
    <div className="game-board">
      <Timer />
      <div style={{ height: 500, width: 1400 }} className="game">
        <Crossword
          onCorrect={onCorrect}
          onCellChange={onCellChange}
          ref={crossword}
          data={puzzleData}
          useStorage={false}
          theme={theme}
        />
      </div>
      <Scores />
    </div>
  )
}
