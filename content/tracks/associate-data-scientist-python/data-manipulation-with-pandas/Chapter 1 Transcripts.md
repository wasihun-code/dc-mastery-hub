Chapter 1 Transcripts



Transcript

1\. Introducing DataFrames

00:00 - 00:05

Hi, I'm Richie. I'll be your tour guide through the world of pandas.



2\. What's the point of pandas?

00:05 - 00:14

pandas is a Python package for data manipulation. It can also be used for data visualization; we'll get to that in Chapter 4.



3\. Course outline

00:14 - 00:39

We'll start by talking about DataFrames, which form the core of pandas. In chapter 2, we'll discuss aggregating data to gather insights. In chapter 3, you'll learn all about slicing and indexing to subset DataFrames. Finally, you'll visualize your data, deal with missing data, and read data into a DataFrame. Let's dive in.



4\. pandas is built on NumPy and Matplotlib

00:39 - 01:03

pandas is built on top of two essential Python packages, NumPy and Matplotlib. Numpy provides multidimensional array objects for easy data manipulation that pandas uses to store data, and Matplotlib has powerful data visualization capabilities that pandas takes advantage of.



5\. pandas is popular

01:03 - 01:17

pandas has millions of users, with PyPi recording about 14 million downloads in December 2019. This represents almost the entire Python data science community!



1 https://pypistats.org/packages/pandas

6\. Rectangular data

01:17 - 01:43

There are several ways to store data for analysis, but rectangular data, sometimes called "tabular data" is the most common form. In this example, with dogs, each observation, or each dog, is a row, and each variable, or each dog property, is a column. pandas is designed to work with rectangular data like this.



7\. pandas DataFrames

01:43 - 02:12

In pandas, rectangular data is represented as a DataFrame object. Every programming language used for data analysis has something similar to this. R also has DataFrames, while SQL has database tables. Every value within a column has the same data type, either text or numeric, but different columns can contain different data types.



8\. Exploring a DataFrame: .head()

02:12 - 02:38

When you first receive a new dataset, you want to quickly explore it and get a sense of its contents. pandas has several methods for this. The first is head, which returns the first few rows of the DataFrame. We only had seven rows to begin with, so it's not super exciting, but this becomes very useful if you have many rows.



9\. Exploring a DataFrame: .info()

02:38 - 02:48

The info method displays the names of columns, the data types they contain, and whether they have any missing values.



10\. Exploring a DataFrame: .shape

02:48 - 03:00

A DataFrame's shape attribute contains a tuple that holds the number of rows followed by the number of columns. Since this is an attribute instead of a method, you write it without parentheses.



11\. Exploring a DataFrame: .describe()

03:00 - 03:22

The describe method computes some summary statistics for numerical columns, like mean and median. "count" is the number of non-missing values in each column. describe is good for a quick overview of numeric variables, but if you want more control, you'll see how to perform more specific calculations later in the course.



12\. Components of a DataFrame: .to\_numpy()

03:22 - 03:33

DataFrames consist of three different components that you can access individually. The to\_numpy method returns the data values as a 2-dimensional NumPy array.



13\. Components of a DataFrame: .columns and .index

03:33 - 04:09

The other two components of a DataFrame are labels for columns and rows. The columns attribute contains column names, and the index attribute contains row numbers or row names. Be careful, since row labels are stored in dot-index, not in dot-rows. Notice that these are Index objects, which we'll cover in Chapter 3. This allows for flexibility in labels. For example, the dogs data uses row numbers, but row names are also possible.



14\. pandas Philosophy

04:09 - 04:54

Python has a semi-official philosophy on how to write good code called The Zen of Python. One suggestion is that given a programming problem, there should only be one obvious solution. As you go through this course, bear in mind that pandas deliberately doesn't follow this philosophy. Instead, there are often multiple ways to solve a problem, leaving you to choose the best. In this respect, pandas is like a Swiss Army Knife, giving you a variety of tools, making it incredibly powerful, but more difficult to learn. In this course, we aim for a more streamlined approach to pandas, only covering the most important ways of doing things.



1 https://www.python.org/dev/peps/pep-0020/





Transcript

1\. Sorting and subsetting

00:00 - 00:08

In this video, we'll cover the two simplest and possibly most important ways to find interesting parts of your DataFrame.



2\. Sorting

00:08 - 00:41

The first thing you can do is change the order of the rows by sorting them so that the most interesting data is at the top of the DataFrame. You can sort rows using the sort\_values method, passing in a column name that you want to sort by. For example, when we apply sort\_values on the weight\_kg column of the dogs DataFrame, we get the lightest dog at the top, Stella the Chihuahua, and the heaviest dog at the bottom, Bernie the Saint Bernard.



3\. Sorting in descending order

00:41 - 00:49

Setting the ascending argument to False will sort the data the other way around, from heaviest dog to lightest dog.



4\. Sorting by multiple variables

00:49 - 01:08

We can sort by multiple variables by passing a list of column names to sort\_values. Here, we sort first by weight, then by height. Now, Charlie, Lucy, and Bella are ordered from shortest to tallest, even though they all weigh the same.



5\. Sorting by multiple variables

01:08 - 01:24

To change the direction values are sorted in, pass a list to the ascending argument to specify which direction sorting should be done for each variable. Now, Charlie, Lucy, and Bella are ordered from tallest to shortest.



6\. Subsetting columns

01:24 - 01:39

We may want to zoom in on just one column. We can do this using the name of the DataFrame, followed by square brackets with a column name inside. Here, we can look at just the name column.



7\. Subsetting multiple columns

01:39 - 02:11

To select multiple columns, you need two pairs of square brackets. In this code, the inner and outer square brackets are performing different tasks. The outer square brackets are responsible for subsetting the DataFrame, and the inner square brackets are creating a list of column names to subset. This means you could provide a separate list of column names as a variable and then use that list to perform the same subsetting. Usually, it's easier to do in one line.



8\. Subsetting rows

02:11 - 02:32

There are lots of different ways to subset rows. The most common way to do this is by creating a logical condition to filter against. For example, let's find all the dogs whose height is greater than 50 centimeters. Now we have a True or False value for every row.



9\. Subsetting rows

02:32 - 02:42

We can use the logical condition inside of square brackets to subset the rows we're interested in to get all of the dogs taller than 50 centimeters.



10\. Subsetting based on text data

02:42 - 02:54

We can also subset rows based on text data. Here, we use the double equal sign in the logical condition to filter the dogs that are Labradors.



11\. Subsetting based on dates

02:54 - 03:12

We can also subset based on dates. Here, we filter all the dogs born before 2015. Notice that the dates are in quotes and are written as year then month, then day. This is the international standard date format.



12\. Subsetting based on multiple conditions

03:12 - 03:36

To subset the rows that meet multiple conditions, you can combine conditions using logical operators, such as the "and" operator seen here. This means that only rows that meet both of these conditions will be subsetted. You could also do this in one line of code, but you'll also need to add parentheses around each condition.



13\. Subsetting using .isin()

03:36 - 03:56

If you want to filter on multiple values of a categorical variable, the easiest way is to use the isin method. This takes in a list of values to filter for. Here, we check if the color of a dog is black or brown, and use this condition to subset the data.





Transcript

1\. New columns

00:00 - 00:17

In the last lesson, you saw how to subset and sort a DataFrame to extract interesting bits. However, often when you first receive a DataFrame, the contents aren't exactly what you want. You may have to add new columns derived from existing columns.



2\. Adding a new column

00:17 - 00:53

Creating and adding new columns can go by many names, including mutating a DataFrame, transforming a DataFrame, and feature engineering. Let's say we want to add a new column to our DataFrame that has each dog's height in meters instead of centimeters. On the left-hand side of the equals, we use square brackets with the name of the new column we want to create. On the right-hand side, we have the calculation. Notice that both the existing column and the new column we just created are in the DataFrame.



3\. Doggy mass index

00:53 - 01:21

Let's see what the results are if we calculate the body mass index, or BMI, of these dogs. BMI is usually calculated by taking a person's weight in kilograms and dividing it by their height in meters, squared. Instead of doing this with people, we'll try it out with dogs. Again, the new column is on the left-hand side of the equals, but this time, our calculation involves two columns.



4\. Multiple manipulations

01:21 - 01:56

The real power of pandas comes in when you combine all the skills you've learned so far. Let's figure out the names of skinny, tall dogs. First, to define the skinny dogs, we take the subset of the dogs who have a BMI of under 100. Next, we sort the result in descending order of height to get the tallest skinny dogs at the top. Finally, we keep only the columns we're interested in. Here, you can see that Max is the tallest dog with a BMI of under 100.





Chapter 2 Transcripts



Transcript

1\. Summary statistics

00:00 - 00:27

Hi, I'm Maggie, and I'll be the other instructor for this course. In the first chapter, you learned about DataFrames, how to sort and subset them, and how to add new columns to them. In this chapter, we'll talk about aggregating data, starting with summary statistics. Summary statistics, as follows from their name, are numbers that summarize and tell you about your dataset.



2\. Summarizing numerical data

00:27 - 00:59

One of the most common summary statistics for numeric data is the mean, which is one way of telling you where the "center" of your data is. You can calculate the mean of a column by selecting the column with square brackets and calling dot-mean. There are lots of other summary statistics that you can compute on columns, like median and mode, minimum and maximum, and variance and standard deviation. You can also take sums and calculate quantiles.



3\. Summarizing dates

00:59 - 01:17

You can also get summary statistics for date columns. For example, we can find the oldest dog's date of birth by taking the minimum of the date of birth column. Similarly, we can take the maximum to see that the youngest dog was born in 2018.



4\. The .agg() method

01:17 - 01:54

The aggregate, or agg, method allows you to compute custom summary statistics. Here, we create a function called pct30 that computes the thirtieth percentile of a DataFrame column. Don't worry if this code doesn't make sense to you -- just know that the function takes in a column and spits out the column's thirtieth percentile. Now we can subset the weight column and call dot-agg, passing in the name of our function, pct30. It gives us the thirtieth percentile of the dogs' weights.



5\. Summaries on multiple columns

01:54 - 02:05

agg can also be used on more than one column. By selecting the weight and height columns before calling agg, we get the thirtieth percentile for both columns.



6\. Multiple summaries

02:05 - 02:28

We can also use agg to get multiple summary statistics at once. Here's another function that computes the fortieth percentile called pct40. We can pass a list of functions into agg, in this case, pct30 and pct40, which will return the thirtieth and fortieth percentiles of the dogs' weights.



7\. Cumulative sum

02:28 - 03:05

pandas also has methods for computing cumulative statistics, for example, the cumulative sum. Calling cumsum on a column returns not just one number, but a number for each row of the DataFrame. The first number returned, or the number in the zeroth index, is the first dog's weight. The next number is the sum of the first and second dogs' weights. The third number is the sum of the first, second, and third dogs' weights, and so on. The last number is the sum of all the dogs' weights.



8\. Cumulative statistics

03:05 - 03:20

pandas also has methods for other cumulative statistics, such as the cumulative maximum, cumulative minimum, and the cumulative product. These all return an entire column of a DataFrame, rather than a single number.



9\. Walmart

03:20 - 03:53

In this chapter, you'll be working with data on Walmart stores, which is a chain of department stores in the US. The dataset contains weekly sales in US dollars in various stores. Each store has an ID number and a specific store type. The sales are also separated by department ID. Along with weekly sales, there is information about whether it was a holiday week or not, the average temperature during the week in that location, the average fuel price in dollars per liter that week, and the national unemployment rate that week.





Transcript

1\. Counting

00:00 - 00:10

So far, in this chapter, you've learned how to summarize numeric variables. In this video, you'll learn how to summarize categorical data using counting.



2\. Avoiding double counting

00:10 - 00:19

Counting dogs is no easy task when they're running around the park. It's hard to keep track of who you have and haven't counted!



3\. Vet visits

00:19 - 00:38

Here's a DataFrame that contains vet visits. The vet's office wants to know how many dogs of each breed have visited their office. However, some dogs have been to the vet more than once, like Max and Stella, so we can't just count the number of each breed in the breed column.



4\. Dropping duplicate names

00:38 - 01:21

Let's try to fix this by removing rows that contain a dog name already listed earlier in the dataset, or in other words; we'll extract a dog with each name from the dataset once. We can do this using the drop\_duplicates method. It takes an argument, subset, which is the column we want to find our duplicates based on - in this case, we want all the unique names. Now we have a list of dogs where each one appears once. We have Max the Chow Chow, but where did Max the Labrador go? Because we have two different dogs with the same name, we'll need to consider more than just name when dropping duplicates.



5\. Dropping duplicate pairs

01:21 - 01:44

Since Max and Max are different breeds, we can drop the rows with pairs of name and breed listed earlier in the dataset. To base our duplicate dropping on multiple columns, we can pass a list of column names to the subset argument, in this case, name and breed. Now both Maxes have been included, and we can start counting.



6\. Easy as 1, 2, 3

01:44 - 01:57

To count the dogs of each breed, we'll subset the breed column and use the value\_counts method. We can also use the sort argument to get the breeds with the biggest counts on top.



7\. Proportions

01:57 - 02:06

The normalize argument can be used to turn the counts into proportions of the total. 25% of the dogs that go to this vet are Labradors.





Transcript

1\. Grouped summary statistics

00:00 - 00:09

So far, you've been calculating summary statistics for all rows of a dataset, but summary statistics can be useful to compare different groups.



2\. Summaries by group

00:09 - 00:43

While computing summary statistics of entire columns may be useful, you can gain many insights from summaries of individual groups. For example, does one color of dog weigh more than another on average? Are female dogs taller than males? You can already answer these questions with what you've learned so far! We can subset the dogs into groups based on their color, and take the mean of each. But that's a lot of work, and the duplicated code means you can easily introduce copy and paste bugs.



3\. Grouped summaries

00:43 - 01:01

That's where the groupby method comes in. We can group by the color variable, select the weight column, and take the mean. This will give us the mean weight for each dog color. This was just one line of code compared to the five we had to write before to get the same results.



4\. Multiple grouped summaries

01:01 - 01:20

Just like with ungrouped summary statistics, we can use the agg method to get multiple statistics. Here, we pass a list of functions into agg after grouping by color. This gives us the minimum, maximum, and sum of the different colored dogs' weights.



5\. Grouping by multiple variables

01:20 - 01:34

You can also group by multiple columns and calculate summary statistics. Here, we group by color and breed, select the weight column and take the mean. This gives us the mean weight of each breed of each color.



6\. Many groups, many summaries

01:34 - 01:40

You can also group by multiple columns and aggregate by multiple columns.





Transcript

1\. Pivot tables

00:00 - 00:12

Pivot tables are another way of calculating grouped summary statistics. If you've ever used a spreadsheet, chances are you've used a pivot table. Let's see how to create pivot tables in pandas.



2\. Group by to pivot table

00:12 - 00:36

In the last lesson, we grouped the dogs by color and calculated their mean weights. We can do the same thing using the pivot\_table method. The "values" argument is the column that you want to summarize, and the index column is the column that you want to group by. By default, pivot\_table takes the mean value for each group.



3\. Different statistics

00:36 - 00:49

If we want a different summary statistic, we can use the aggfunc argument and pass it a function. Here, we take the median for each dog color.



4\. Multiple statistics

00:49 - 01:01

To get multiple summary statistics at a time, we can pass a list of functions to the aggfunc argument. Here, we get the mean and median for each dog color.



5\. Pivot on two variables

01:01 - 01:31

You also previously computed the mean weight grouped by two variables: color and breed. We can also do this using the pivot\_table method. To group by two variables, we can pass a second variable name into the columns argument. While the result looks a little different than what we had before, it contains the same numbers. There are NaNs, or missing values, because there are no black Chihuahuas or gray Labradors in our dataset, for example.



6\. Filling missing values in pivot tables

01:31 - 01:44

Instead of having lots of missing values in our pivot table, we can have them filled in using the fill\_value argument. Here, all of the NaNs get filled in with zeros.



7\. Summing with pivot tables

01:44 - 02:36

If we set the margins argument to True, the last row and last column of the pivot table contain the mean of all the values in the column or row, not including the missing values that were filled in with Os. For example, in the last row of the Labrador column, we can see that the mean weight of the Labradors is 26 kilograms. In the last column of the Brown row, the mean weight of the Brown dogs is 24 kilograms. The value in the bottom right, in the last row and last column, is the mean weight of all the dogs in the dataset. Using margins equals True allows us to see a summary statistic for multiple levels of the dataset: the entire dataset, grouped by one variable, by another variable, and by two variables.





Chapter 3 Transcripts



Transcript

1\. Explicit indexes

00:00 - 00:10

In chapter one, you saw that DataFrames are composed of three parts: a NumPy array for the data, and two indexes to store the row and column details.



2\. The dog dataset, revisited

00:10 - 00:13

Here's the dog dataset again.



3\. .columns and .index

00:13 - 00:22

Recall that dot-columns contains an Index object of column names, and dot-index contains an Index object of row numbers.



4\. Setting a column as the index

00:22 - 00:45

You can move a column from the body of the DataFrame to the index. This is called "setting an index," and it uses the set\_index method. Notice that the output has changed slightly; in particular, a quick visual clue that name is now in the index is that the index values are left-aligned rather than right-aligned.



5\. Removing an index

00:45 - 00:56

To undo what you just did, you can reset the index - that is, you remove it. This is done via reset\_index.



6\. Dropping an index

00:56 - 01:07

reset\_index has a drop argument that allows you to discard an index. Here, setting drop to True entirely removes the dog names.



7\. Indexes make subsetting simpler

01:07 - 01:42

You may be wondering why you should bother with indexes. The answer is that it makes subsetting code cleaner. Consider this example of subsetting for the rows where the dog is called Bella or Stella. It's a fairly tricky line of code for such a simple task. Now, look at the equivalent when the names are in the index. DataFrames have a subsetting method called "loc," which filters on index values. Here you simply pass the dog names to loc as a list. Much easier!



8\. Index values don't need to be unique

01:42 - 01:50

The values in the index don't need to be unique. Here, there are two Labradors in the index.



9\. Subsetting on duplicated index values

01:50 - 01:56

Now, if you subset on "Labrador" using loc, all the Labrador data is returned.



10\. Multi-level indexes a.k.a. hierarchical indexes

01:56 - 02:22

You can include multiple columns in the index by passing a list of column names to set\_index. Here, breed and color are included. These are called multi-level indexes, or hierarchical indexes: the terms are synonymous. There is an implication here that the inner level of index, in this case, color, is nested inside the outer level, breed.



11\. Subset the outer level with a list

02:22 - 02:38

To take a subset of rows at the outer level index, you pass a list of index values to loc. Here, the list contains Labrador and Chihuahua, and the resulting subset contains all dogs from both breeds.



12\. Subset inner levels with a list of tuples

02:38 - 03:01

To subset on inner levels, you need to pass a list of tuples. Here, the first tuple specifies Labrador at the outer level and Brown at the inner level. The resulting rows have to match all conditions from a tuple. For example, the black Labrador wasn't returned because the brown condition wasn't matched.



13\. Sorting by index values

03:01 - 03:19

In chapter 1, you saw how to sort the rows of a DataFrame using sort\_values. You can also sort by index values using sort\_index. By default, it sorts all index levels from outer to inner, in ascending order.



14\. Controlling sort\_index

03:19 - 03:26

You can control the sorting by passing lists to the level and ascending arguments.



15\. Now you have two problems

03:26 - 04:23

Indexes are controversial. Although they simplify subsetting code, there are some downsides. Index values are just data. Storing data in multiple forms makes it harder to think about. There is a concept called "tidy data," where data is stored in tabular form - like a DataFrame. Each row contains a single observation, and each variable is stored in its own column. Indexes violate the last rule since index values don't get their own column. In pandas, the syntax for working with indexes is different from the syntax for working with columns. By using two syntaxes, your code is more complicated, which can result in more bugs. If you decide you don't want to use indexes, that's perfectly reasonable. However, it's useful to know how they work for cases when you need to read other people's code.



16\. Temperature dataset

04:23 - 04:29

In this chapter, you'll work with a monthly time series of air temperatures in cities around the world.





Transcript

1\. Slicing and subsetting with .loc and .iloc

00:00 - 00:04

Slicing is a technique for selecting consecutive elements from objects.



2\. Slicing lists

00:04 - 00:47

Here are the dog breeds, this time as a list. To slice the list, you pass first and last positions separated by a colon into square brackets. Remember that Python positions start from zero, so 2 refers to the third element, Chow Chow. Also remember that the last position, 5, is not included in the slice, so we finish at Labrador, not Chihuahua. If you want the slice to start from the beginning of the list, you can omit the zero. Here, using colon-3 returns the first three elements. Slicing with colon on its own returns the whole list.



3\. Sort the index before you slice

00:47 - 01:03

You can also slice DataFrames, but first, you need to sort the index. Here, the dogs dataset has been given a multi-level index of breed and color; then, the index is sorted with sort\_index.



4\. Slicing the outer index level

01:03 - 01:33

To slice rows at the outer level of an index, you call loc, passing the first and last values separated by a colon. The full dataset is shown on the right for comparison. There are two differences compared to slicing lists. Rather than specifying row numbers, you specify index values. Secondly, notice that the final value is included. Here, Poodle is included in the results.



5\. Slicing the inner index levels badly

01:33 - 01:54

The same technique doesn't work on inner index levels. Here, trying to slice from Tan to Grey returns an empty DataFrame instead of the six dogs we wanted. It's important to understand the danger here. pandas doesn't throw an error to let you know that there is a problem, so be careful when coding.



6\. Slicing the inner index levels correctly

01:54 - 02:09

The correct approach to slicing at inner index levels is to pass the first and last positions as tuples. Here, the first element to include is a tuple of Labrador and Brown.



7\. Slicing columns

02:09 - 02:42

Since DataFrames are two-dimensional objects, you can also slice columns. You do this by passing two arguments to loc. The simplest case involves subsetting columns but keeping all rows. To do this, pass a colon as the first argument to loc. As with slicing lists, a colon by itself means "keep everything." The second argument takes column names as the first and last positions to slice on.



8\. Slice twice

02:42 - 02:55

You can slice on rows and columns at the same time: simply pass the appropriate slice to each argument. Here, you see the previous two slices being performed in the same line of code.



9\. Dog days

02:55 - 03:07

An important use case of slicing is to subset DataFrames by a range of dates. To demonstrate this, let's set the date\_of\_birth column as the index and sort by this index.



10\. Slicing by dates

03:07 - 03:14

You slice dates with the same syntax as other types. The first and last dates are passed as strings.



11\. Slicing by partial dates

03:14 - 03:41

One helpful feature is that you can slice by partial dates. Here, the first and last positions are only specified as 2014 and 2016, with no month or day parts. pandas interprets this as slicing from the start of 2014 to the end of 2016; that is, all dates in 2014, 2015, and 2016.



12\. Subsetting by row/column number

03:41 - 04:08

You can also slice DataFrames by row or column number using the iloc method. This uses a similar syntax to slicing lists, except that there are two arguments: one for rows and one for columns. Notice that, like list slicing but unlike loc, the final values aren't included in the slice. In this case, the fifth row and fourth column aren't included.





Transcript

1\. Working with pivot tables

00:00 - 00:09

You saw how to create pivot tables with pandas in chapter two. In this lesson, you'll perform subsetting and calculations on pivot tables.



2\. A bigger dog dataset

00:09 - 00:16

Here's a larger version of the dog dataset. The extra dogs mean we have something to compute on.



3\. Pivoting the dog pack

00:16 - 00:42

Recall that you create a pivot table by calling dot-pivot\_table. The first argument is the column name containing values to aggregate. The index argument lists the columns to group by and display in rows, and the columns argument lists the columns to group by and display in columns. We'll use the default aggregation function, which is mean.



4\. .loc\[] + slicing is a power combo

00:42 - 01:00

Pivot tables are just DataFrames with sorted indexes. That means that all the fun stuff you've learned so far this chapter can be used on them. In particular, the loc and slicing combination is ideal for subsetting pivot tables, like so.



5\. The axis argument

01:00 - 01:25

The methods for calculating summary statistics on a DataFrame, such as mean, have an axis argument. The default value is "index," which means "calculate the statistic across rows." Here, the mean is calculated for each color. That is, "across the breeds." The behavior is the same as if you hadn't specified the axis argument.



6\. Calculating summary stats across columns

01:25 - 01:56

To calculate a summary statistic for each row, that is, "across the columns," you set axis to "columns." Here, the mean height is calculated for each breed. That is, "across the colors." For most DataFrames, setting the axis argument doesn't make any sense, since you'll have different data types in each column. Pivot tables are a special case since every column contains the same data type.





Chapter 4 Transcripts



1\. Visualizing your data

00:00 - 00:11

Plots are a powerful way to share the insights you've gained from your data. In this lesson, we'll use a bigger dataset of dogs, called dog\_pack, to make visualization easier.



2\. Histograms

00:11 - 01:08

Remember when we talked about matplotlib at the beginning of the course? We'll need to import matplotlib-dot-pyplot as plt in order to display our visualizations. Just like pd is the standard alias for pandas, plt is the standard alias for matplotlib-dot-pyplot. Let's create a histogram, which shows the distribution of a numeric variable. We can create a histogram of the height variable by selecting the column and calling dot-hist. In order to show the plot, we need to call plt-dot-show. The x-axis represents the heights of the dogs, and the y-axis represents the number of dogs in each height range. By grouping observations into ranges, the histogram allows us to see that there are a lot of dogs around 50 to 60 centimeters tall.



3\. Histograms

01:08 - 01:20

We can adjust the number of bars, or bins, using the "bins" argument. Increasing or decreasing this can give us a better idea of what the distribution looks like.



4\. Bar plots

01:20 - 01:38

Bar plots can reveal relationships between a categorical variable and a numeric variable, like breed and weight. To compute the average weight of each breed, we group by breed, select the weight column, and take the mean, giving us the average weight of each breed.



5\. Bar plots

01:38 - 02:00

Now we can create a bar plot from the mean weights using the plot method, setting "kind" equal to "bar." Finally, we call plt-dot-show. To add a title to our plot, we can use the title argument of the plot method. It looks like Saint Bernards are the heaviest breed on average! Woof!



6\. Line plots

02:00 - 02:29

Line plots are great for visualizing changes in numeric variables over time. Lucky for us, a Labrador named Sully has been weighed by his owner every month - let's see how his weight has changed over the year. We can use the plot method again, but this time, we pass in three arguments: date as x, weight as y, and "kind" equals "line." Sully's weight has fluctuated quite a bit over the year!



7\. Rotating axis labels

02:29 - 02:46

We may want to rotate the x-axis labels to make the text easier to read. This can be done by passing an angle in degrees with the "rot" argument. Here, we rotate the labels by 45 degrees.



8\. Scatter plots

02:46 - 03:10

Scatter plots are great for visualizing relationships between two numeric variables. To plot each dog's height versus their weight, we call the plot method with x equal to height\_cm, y equal to weight\_kg, and "kind" equal to "scatter." From our plot, it looks like taller dogs tend to weigh more.



9\. Layering plots

03:10 - 03:28

Plots can also be layered on top of one another. For example, we can create a histogram of female dogs' heights, and put a histogram of male dogs' heights on top, then call show. However, we can't tell which color represents which sex.



10\. Add a legend

03:28 - 03:41

We can use plt-dot-legend, passing in a list of labels, and then call show. Now we know which color is which, but we can't see what's going on behind the orange histogram.



11\. Transparency

03:41 - 03:56

Let's fix this problem by making the histograms translucent. We can use hist's alpha argument, which takes a number. 0 means completely transparent that is, invisible, and 1 means completely opaque.



12\. Avocados

03:56 - 04:08

In this chapter, you'll be working with a dataset that contains weekly US avocado sales data, broken down by avocado size, and whether or not the avocados were organic.







Transcript

1\. Missing values

00:00 - 00:06

You could be given a DataFrame that has missing values, so it's important to know how to handle them.



2\. What's a missing value?

00:06 - 00:18

Most data is not perfect - there's always a possibility that there are some pieces missing from your dataset. For example, maybe on the day that Bella and Cooper's owner weighed them,



3\. What's a missing value?

00:18 - 00:24

the scale was broken. Now we have two missing values in our dataset.



4\. Missing values in pandas DataFrames

00:24 - 00:32

In a pandas DataFrame, missing values are indicated with N-a-N, which stands for "not a number."



5\. Detecting missing values

00:32 - 00:58

When you first get a DataFrame, it's a good idea to get a sense of whether it contains any missing values, and if so, how many. That's where the isna method comes in. When we call isna on a DataFrame, we get a Boolean for every single value indicating whether the value is missing or not, but this isn't very helpful when you're working with a lot of data.



6\. Detecting any missing values

00:58 - 01:15

If we chain dot-isna with dot-any, we get one value for each variable that tells us if there are any missing values in that column. Here, we see that there's at least one missing value in the weight column, but not in any of the others.



7\. Counting missing values

01:15 - 01:27

Since taking the sum of Booleans is the same thing as counting the number of Trues, we can combine sum with isna to count the number of NaNs in each column.



8\. Plotting missing values

01:27 - 01:47

We can use those counts to visualize the missing values in the dataset using a bar plot. Plots like this are more interesting when you have missing data across different variables, while here, only weights are missing. Now that we know there are missing values in the dataset, what can we do about them?



9\. Removing missing values

01:47 - 02:05

One option is to remove the rows in the DataFrame that contain missing values. This can be done using the dropna method. However, this may not be ideal if you have a lot of missing data, since that means losing a lot of observations.



10\. Replacing missing values

02:05 - 02:25

Another option is to replace missing values with another value. The fillna method takes in a value, and all NaNs will be replaced with this value. There are also many sophisticated techniques for replacing missing values, which you can learn more about in our course about missing data.





Transcript

1\. Creating DataFrames

00:00 - 00:07

Now that you've learned a lot about how to work with pandas DataFrames, how do you get data into a DataFrame in the first place?



2\. Dictionaries

00:07 - 00:52

Before creating your own DataFrames, let's talk about dictionaries. A dictionary is a way of storing data in Python. It holds a set of key-value pairs. You can create a dictionary like this, using curly braces. Inside, each key-value pair is written as "key colon value." Let's create a dictionary that holds information about a book. "Title" is a key in the dictionary, and "Charlotte's Web" is its corresponding value, and so on. You can access values of a dictionary via their keys in square brackets. For example, we can access the value of "title" like this.



3\. Creating DataFrames

00:52 - 01:12

There are many ways to create DataFrames from scratch, but we'll discuss two ways: from a list of dictionaries and from a dictionary of lists. In the first method, the DataFrame is built up row by row, while in the second method, the DataFrame is built up column by column.



4\. List of dictionaries - by row

01:12 - 02:05

We have some new dog data to put into a DataFrame. Let's start with the first method to do this, creating a list of dictionaries. First, we'll create a new list using square brackets to hold our dictionaries. Then, we'll go through the first row of our data and put it in a dictionary. Each key, on the left of each colon, will become a column name. Each value is one dog's data for that column. Here, the first key is "name," which is the first column name, and its corresponding value is "Ginger," the name of the first dog. The second key is the second column name, "breed," and its value is "Dachshund," which is the first dog's breed. Then we have the dog's height and weight. For the next row, we create another dictionary that follows the same format.



5\. List of dictionaries - by row

02:05 - 02:14

Now that we have our list of dictionaries, we can pass it into pd-dot-DataFrame to convert it into DataFrame form.



6\. Dictionary of lists - by column

02:14 - 03:20

Now let's talk about the dictionary of lists method. When using this method, we need to go through the data column by column. Remember that keys are to the left of a colon, and values are to the right. Each key will be a column name, and each value will be a list of the values in the column. First, we'll create a dictionary using curly braces. Let's start with the first column, which is called "name," so the first key is "name." The value is a list containing each name, from top to bottom. In this case, it's "Ginger" and "Scout." Next, we have the "breed" column, so we add "breed" as a key, and its corresponding value is a list containing "Dachshund" and "Dalmatian." Then we have height\_cm, which is 22 and 59, and weight\_kg, which is 10 and 25. Now that we have our dictionary of lists set up, we can pass it into pd-dot-DataFrame to convert it into a pandas DataFrame.



7\. Dictionary of lists - by column

03:20 - 03:25

If we print the new DataFrame, we can see that it's exactly what we wanted.



Transcript

1\. Reading and writing CSVs

00:00 - 00:15

You now know how to create your own DataFrames, but typing out your data entry-by-entry isn't usually the most efficient way to get your data into a DataFrame. In this video, you'll learn how to pull data from CSV files.



2\. What's a CSV file?

00:15 - 00:49

CSV, or comma-separated values, is a common data storage file type. It's designed to store tabular data, just like a pandas DataFrame. It's a text file, where each row of data has its own line, and each value is separated by a comma. Almost every database, programming language, and piece of data analysis software can read and write CSV files. That makes it a good storage format if you need to share your data with other people who may be using different tools than you.



3\. Example CSV file

00:49 - 00:59

Remember the dogs from the last video? Their data is stored in a CSV file called new\_dogs-dot-csv, which looks like this.



4\. CSV to DataFrame

00:59 - 01:09

We can put this data in a DataFrame using the handy pandas function, read-underscore-csv, and pass it the file path of the CSV.



5\. DataFrame manipulation

01:09 - 01:20

Now that the data is in DataFrame form, we can manipulate it using some of the functions from earlier in the course. Here, we'll add a body mass index column.



6\. DataFrame to CSV

01:20 - 01:42

Now that we've changed the data let's create an updated CSV file to share with the dogs' owners. To convert a DataFrame to a CSV, we can use new\_dogs dot to-underscore-csv, and pass in a new file path. If we take a look at the new file, it contains the BMI column.





RECAP

2\. Recap

00:05 - 00:34

In chapter 1, you saw how to subset and sort DataFrames and how to add new columns. In chapter 2, you saw several methods for aggregating and grouping data to calculate summary statistics. In chapter 3, you saw how using indexing and slicing allows for simpler subsetting. In chapter 4, you saw how to visualize a DataFrame, and how to read data from and write data to CSV files.



3\. More to learn

00:34 - 01:09

I hope you are convinced that pandas is a powerful tool to analyze tabular data. In fact, pandas is so powerful that there are many features that we didn't get around to discussing in this course. To begin with, everything in this course involved a single DataFrame, but sometimes you need to join or "merge" several DataFrames together. Reading from CSV files barely scratches the surface of the options for importing data into pandas. You can also perform very sophisticated exploratory data analysis using pandas.

