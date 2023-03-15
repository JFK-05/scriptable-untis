import { MAX_SUBJECT_NAME_LENGTH, MAX_TIME_STRING, MAX_LONG_SUBJECT_NAME_LENGTH } from '@/constants'
import { Config } from '@/preferences/config'
import { TransformedLesson } from '@/types/transformed'
import { addWidgetLesson } from '@/utils/scriptable/componentHelper'
import { getCharHeight, getTextWidth, asNumericTime, getCharWidth } from '@/utils/helper'
import { filterCanceledLessons } from '@/utils/lessonHelper'
import { ViewBuildData } from '@/widget'
import { addBreak } from '@/utils/scriptable/componentHelper'
import { LessonState } from '@/types/api'
import { colors } from '@/preferences/colors'

export function addViewLessons(
	lessons: TransformedLesson[],
	count: number | undefined,
	{ container, width, height }: ViewBuildData,
	config: Config
) {
	// only allow up to x items to avoid overflow
	let itemCount = 0

	const padding = 4
	const lessonHeight = getCharHeight(config.appearance.fontSize) + 2 * padding

	const innerSpacing = config.appearance.spacing
	// the width including: padding, subject, spacing and icon
	const lessonWidth =
		2 * padding +
		getCharWidth(config.appearance.fontSize) * MAX_SUBJECT_NAME_LENGTH +
		innerSpacing +
		getCharHeight(config.appearance.fontSize)
	const timeWidth = getTextWidth(MAX_TIME_STRING, config.appearance.fontSize) + 2 * padding
	let currentWidth = lessonWidth + config.appearance.spacing + timeWidth

	let showToTime = false

	// check if there is space for a "to" time
	if (currentWidth + config.appearance.spacing + timeWidth <= width) {
		showToTime = config.views.lessons.showEndTimes
		currentWidth += config.appearance.spacing + timeWidth
	}

	let remainingHeight = height

	// add the remaining lessons until the max item count is reached
	for (let i = 0; i < lessons.length; i++) {
		const previousLesson = lessons[i - 1]
		const lesson = lessons[i]

		// take into account the spacing between the lessons
		if (i > 0) {
			remainingHeight -= config.appearance.spacing
		}

		// check for a break if the previous lesson exists
		if (previousLesson) {
			// if the gap between the previous lesson and this lesson is too big, add a break
			const gapDuration = lesson.from.getTime() - previousLesson.to.getTime()
			if (
				previousLesson &&
				config.views.lessons.showLongBreaks &&
				gapDuration > config.config.breakMaxMinutes * 60 * 1000
			) {
				addBreak(container, previousLesson.to, lesson.from, showToTime, config)
				itemCount++
				remainingHeight -= config.appearance.spacing + lessonHeight
				if ((count && itemCount >= count) || remainingHeight < lessonHeight + config.appearance.spacing) break
			}
		}

		// check if the user wants to show canceled lessons
		const isRescheduled = lesson.isRescheduled && lesson.rescheduleInfo.isSource
		const istCancelled = lesson.state === LessonState.CANCELED || lesson.state === LessonState.FREE || isRescheduled
		if (!config.views.lessons.showCanceled && istCancelled) continue

		// only show the time if the previous lesson didn't start at the same time
		const showTime = !previousLesson || previousLesson.from.getTime() !== lesson.from.getTime()
		// if there is space for more text (longer subject name)
		const useSubjectLongName =
			currentWidth + MAX_LONG_SUBJECT_NAME_LENGTH + getCharWidth(config.appearance.fontSize) <= width
		addWidgetLesson(lesson, container, config, { showTime, showToTime, useSubjectLongName })

		itemCount++
		remainingHeight -= lessonHeight

		// exit if the max item count is reached
		if (count && itemCount >= count) break
		// exit if it would get too big
		if (remainingHeight < lessonHeight + config.appearance.spacing) break
	}

	const remainingFontSize = config.appearance.fontSize * 0.8
	// add a "+ x more" if there are more lessons and there is enough space
	if (lessons.length > itemCount && remainingHeight > getCharHeight(remainingFontSize) + config.appearance.spacing) {
		const realLessons = filterCanceledLessons(lessons.slice(itemCount - 1))
		const dayToString = asNumericTime(realLessons[realLessons.length - 1].to)
		// count the number of remaining lessons including the duration
		const lessonCount = realLessons.reduce((acc, lesson) => {
			return acc + lesson.duration
		}, 0)
		const andMoreText = container.addText(` + ${lessonCount} more, until ${dayToString}`)
		console.log(`Added label for ${lessonCount} more lessons until ${dayToString}`)
		andMoreText.font = Font.regularSystemFont(remainingFontSize)
		andMoreText.textColor = colors.text.secondary
		remainingHeight -= getCharHeight(remainingFontSize) + config.appearance.spacing
	}

	return height - remainingHeight
}
